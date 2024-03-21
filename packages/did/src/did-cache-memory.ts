import { MemoryStore, MemoryStoreOptions } from '@atproto/caching'

import { DidCache } from './did-cache.js'
import { DidDocument } from './did-document.js'
import { Did } from './did.js'

export type DidCacheMemoryOptions = MemoryStoreOptions<Did, DidDocument>

export const DEFAULT_TTL = 3600 * 1000 // 1 hour
export const DEFAULT_MAX_SIZE = 50 * 1024 * 1024 // ~50MB

export class DidCacheMemory
  extends MemoryStore<Did, DidDocument>
  implements DidCache
{
  constructor(options?: DidCacheMemoryOptions) {
    super(
      options?.max == null
        ? { ttl: DEFAULT_TTL, maxSize: DEFAULT_MAX_SIZE, ...options }
        : { ttl: DEFAULT_TTL, ...options },
    )
  }
}
