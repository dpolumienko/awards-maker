import { KICK_HOST_SCOPES, upsertKickUser } from '../../utils/users'

/**
 * Signing in to run a show with a Kick channel - the twin of twitch-host.get.ts.
 * The set matches what Streams Charts asks Kick for, so a channel that already
 * said yes there sees nothing new. Needs its own redirect URI in the Kick app,
 * alongside /auth/kick.
 */
export default defineOAuthKickEventHandler({
  config: { scope: KICK_HOST_SCOPES },

  async onSuccess(event, { user, tokens }) {
    const sessionUser = await upsertKickUser(user, tokens, KICK_HOST_SCOPES)
    await setUserSession(event, { user: sessionUser })
    return sendRedirect(event, '/create')
  },

  onError(event, error) {
    console.error(`[auth] Kick host sign-in failed: ${error.statusMessage || error.message} (${error.statusCode})`)
    return sendRedirect(event, '/create?signin=failed')
  },
})
