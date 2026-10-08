/**
 * Where to land after signing in to vote. Taken from our own cookie rather than
 * a query parameter, and only ever a path on this site - an open redirect on a
 * login endpoint is how a phishing page borrows your domain.
 */
export function safeReturn(event: Parameters<typeof getCookie>[0]): string {
  const to = getCookie(event, 'am-return') || '/'
  deleteCookie(event, 'am-return')
  return to.startsWith('/') && !to.startsWith('//') ? to : '/'
}
