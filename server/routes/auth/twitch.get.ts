import { VOTER_SCOPES, upsertTwitchUser } from '../../utils/users'

/**
 * Signing in to vote. Both legs of the OAuth dance are this one handler: the
 * module redirects to Twitch on the first hit and handles the callback on the
 * second, so the Twitch app must list <domain>/auth/twitch as a redirect URI.
 *
 * A voter is asked for an identity and nothing else. The long consent screen is
 * for hosts - see twitch-host.get.ts - because a viewer who is asked to hand
 * over their chat and their bits in order to click one radio button does not
 * click it.
 */
export default defineOAuthTwitchEventHandler({
  config: { scope: VOTER_SCOPES, emailRequired: true },

  async onSuccess(event, { user, tokens }) {
    const sessionUser = await upsertTwitchUser(user, tokens, VOTER_SCOPES)
    await setUserSession(event, { user: sessionUser })
    return sendRedirect(event, safeReturn(event))
  },

  onError(event, error) {
    // status and message only: error.data carries the token response
    console.error(`[auth] Twitch sign-in failed: ${error.statusMessage || error.message} (${error.statusCode})`)
    return sendRedirect(event, '/?signin=failed')
  },
})

/**
 * Where to land afterwards. Taken from our own cookie rather than a query
 * parameter, and only ever a path on this site - an open redirect on a login
 * endpoint is how a phishing page borrows your domain.
 */
function safeReturn(event: Parameters<typeof getCookie>[0]): string {
  const to = getCookie(event, 'am-return') || '/'
  deleteCookie(event, 'am-return')
  return to.startsWith('/') && !to.startsWith('//') ? to : '/'
}
