/** The host a partner link points at, or '' when it is not a usable address. */
export function partnerHost(url: string | undefined): string {
  const raw = url?.trim()
  if (!raw) return ''
  try {
    return new URL(raw.startsWith('http') ? raw : `https://${raw}`).host
  } catch {
    return ''
  }
}

/**
 * Where a partner's icon comes from: our own server (server/api/partner-icon),
 * so a visitor's browser never calls a third party. The static demo has no
 * server, so there it asks the icon service directly - a demo, not a visitor.
 */
export function partnerIconUrl(host: string, demo: boolean): string {
  if (!host) return ''
  return demo ? `https://icons.duckduckgo.com/ip3/${host}.ico` : `/api/partner-icon?host=${encodeURIComponent(host)}`
}

/**
 * A partner link as people type it - "ssss.com", "https:///ssss.com", "http:/x.com" -
 * made into an address a browser opens, or '' when no host can be read from it.
 */
export function partnerHref(url: string | undefined): string {
  const raw = url?.trim().replace(/^(https?)?:?\/*/i, '')
  if (!raw) return ''
  try {
    const u = new URL(`https://${raw}`)
    return u.host.includes('.') ? u.href : ''
  } catch {
    return ''
  }
}
