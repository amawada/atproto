import { Lexicons } from '@atproto/lexicon'
import {
  getMethodSchemaHTTPMethod,
  constructMethodCallUri,
  constructMethodCallHeaders,
  encodeMethodCallBody,
  httpResponseCodeToEnum,
  httpResponseBodyParse,
} from './util'
import {
  FetchHandler,
  FetchHandlerResponse,
  Headers,
  CallOptions,
  QueryParams,
  ResponseType,
  errorResponseBody,
  ErrorResponseBody,
  XRPCResponse,
  XRPCError,
} from './types'

export class Client {
  fetch: FetchHandler = defaultFetchHandler
  lex = new Lexicons()

  // method calls
  //

  async call(
    serviceUri: string | URL,
    methodNsid: string,
    params?: QueryParams,
    data?: unknown,
    opts?: CallOptions,
  ) {
    return this.service(serviceUri).call(methodNsid, params, data, opts)
  }

  service(serviceUri: string | URL) {
    return new ServiceClient(this, serviceUri)
  }

  // schemas
  // =

  addLexicon(doc: unknown) {
    this.lex.add(doc)
  }

  addLexicons(docs: unknown[]) {
    for (const doc of docs) {
      this.addLexicon(doc)
    }
  }

  removeLexicon(uri: string) {
    this.lex.remove(uri)
  }
}

export class ServiceClient {
  baseClient: Client
  uri: URL
  headers: Record<string, string> = {}

  constructor(baseClient: Client, serviceUri: string | URL) {
    this.baseClient = baseClient
    this.uri = typeof serviceUri === 'string' ? new URL(serviceUri) : serviceUri
  }

  setHeader(key: string, value: string): void {
    this.headers[key] = value
  }

  unsetHeader(key: string): void {
    delete this.headers[key]
  }

  async call(
    methodNsid: string,
    params?: QueryParams,
    data?: unknown,
    opts?: CallOptions,
  ) {
    const def = this.baseClient.lex.getDefOrThrow(methodNsid)
    if (!def || (def.type !== 'query' && def.type !== 'procedure')) {
      throw new Error(
        `Invalid lexicon: ${methodNsid}. Must be a query or procedure.`,
      )
    }

    const httpMethod = getMethodSchemaHTTPMethod(def)
    const httpUri = constructMethodCallUri(methodNsid, def, this.uri, params)
    const httpHeaders = constructMethodCallHeaders(def, data, {
      headers: {
        ...this.headers,
        ...opts?.headers,
      },
      encoding: opts?.encoding,
    })

    const res = await this.baseClient.fetch(
      httpUri,
      httpMethod,
      httpHeaders,
      data,
    )

    const resCode = httpResponseCodeToEnum(res.status)
    if (resCode === ResponseType.Success) {
      return new XRPCResponse(res.body, res.headers)
    } else {
      if (res.body && isErrorResponseBody(res.body)) {
        throw new XRPCError(resCode, res.body.error, res.body.message)
      } else {
        throw new XRPCError(resCode)
      }
    }
  }
}

async function defaultFetchHandler(
  httpUri: string,
  httpMethod: string,
  httpHeaders: Headers,
  httpReqBody: unknown,
): Promise<FetchHandlerResponse> {
  try {
    const res = await fetch(httpUri, {
      method: httpMethod,
      headers: httpHeaders,
      body: encodeMethodCallBody(httpHeaders, httpReqBody),
    })
    const resBody = await res.arrayBuffer()
    return {
      status: res.status,
      headers: Object.fromEntries(res.headers.entries()),
      body: httpResponseBodyParse(res.headers.get('content-type'), resBody),
    }
  } catch (e) {
    throw new XRPCError(ResponseType.Unknown, String(e))
  }
}

function isErrorResponseBody(v: unknown): v is ErrorResponseBody {
  return errorResponseBody.safeParse(v).success
}
