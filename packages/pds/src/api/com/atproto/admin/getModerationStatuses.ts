import { Server } from '../../../../lexicon'
import AppContext from '../../../../context'
import { authPassthru } from './util'

export default function (server: Server, ctx: AppContext) {
  server.com.atproto.admin.getModerationStatuses({
    auth: ctx.authVerifier.role,
    handler: async ({ req, params }) => {
      const { data } =
        await ctx.appViewAgent.com.atproto.admin.getModerationStatuses(
          params,
          authPassthru(req),
        )
      return {
        encoding: 'application/json',
        body: data,
      }
    },
  })
}
