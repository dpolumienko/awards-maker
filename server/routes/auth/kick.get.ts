import { safeReturn } from '../../utils/signin'
import { KICK_VOTER_SCOPES, upsertKickUser } from '../../utils/users'

/**
 * Signing in to vote with Kick - the twin of twitch.get.ts. One handler for
 * both legs of the OAuth dance, so the Kick app must list <domain>/auth/kick as
 * a redirect URI. A voter is asked for an identity and nothing else.
 */
export default defineOAuthKickEventHandler({
  config: { scope: KICK_VOTER_SCOPES },

  async onSuccess(event, { user, tokens }) {
    const sessionUser = await upsertKickUser(user, tokens, KICK_VOTER_SCOPES)
    await setUserSession(event, { user: sessionUser })
    return sendRedirect(event, safeReturn(event))
  },

  onError(event, error) {
    // status and message only: error.data carries the token response
    console.error(`[auth] Kick sign-in failed: ${error.statusMessage || error.message} (${error.statusCode})`)
    return sendRedirect(event, '/?signin=failed')
  },
})
