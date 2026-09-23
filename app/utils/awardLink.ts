import type { Award } from '~/types/award'

/**
 * Carries a published awards inside its own link.
 *
 * There is no backend yet: a show lives in the browser that made it, so the link
 * a host shares opens an empty page for everyone else. Until the API exists, the
 * link takes the show with it - `?s=<payload>` is decoded by the awards page when
 * the slug is not in this browser's storage.
 *
 * Uploaded images are left out on purpose: a cover as a data URL is megabytes,
 * and a link nobody can paste is not a link. **Delete this when the API lands.**
 */
const strip = (award: Award): Award => ({
  ...award,
  look: { ...award.look, coverUrl: undefined, logoUrl: undefined },
  nominations: award.nominations.map((n) => ({
    ...n,
    nominees: n.nominees.map((x) => (x.kind === 'media' ? { ...x, image: undefined } : x)),
  })),
})

const toUrlSafe = (b64: string) => b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const fromUrlSafe = (s: string) => s.replace(/-/g, '+').replace(/_/g, '/')

export function encodeAward(award: Award): string {
  const json = JSON.stringify(strip(award))
  // btoa is latin1-only; the copy and the emote names are not
  return toUrlSafe(btoa(String.fromCharCode(...new TextEncoder().encode(json))))
}

export function decodeAward(payload: string): Award | null {
  try {
    const binary = atob(fromUrlSafe(payload))
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
    const award = JSON.parse(new TextDecoder().decode(bytes)) as Award
    return award?.slug && Array.isArray(award.nominations) ? award : null
  } catch {
    return null
  }
}
