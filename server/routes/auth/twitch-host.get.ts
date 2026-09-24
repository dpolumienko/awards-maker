import { HOST_SCOPES, upsertTwitchUser } from '../../utils/users'

/**
 * Signing in to run a show. Same provider, wider consent: a show reads the
 * channel's subscribers and followers, which is what lets a host limit voting to
 * their own community. The set matches what Streams Charts asks for on
 * `?with=subs`, so a channel that already said yes there sees nothing new.
 *
 * Twitch matches redirect URIs exactly, so this path needs its own entry in the
 * app alongside /auth/twitch.
 */
export default defineOAuthTwitchEventHandler({
  config: { scope: HOST_SCOPES, emailRequired: true },

  async onSuccess(event, { user, tokens }) {
    const sessionUser = await upsertTwitchUser(user, tokens, HOST_SCOPES)
    await setUserSession(event, { user: sessionUser })
    return sendRedirect(event, '/create')
  },

  onError(event, error) {
    console.error(`[auth] Twitch host sign-in failed: ${error.statusMessage || error.message} (${error.statusCode})`)
    return sendRedirect(event, '/create?signin=failed')
  },
})
