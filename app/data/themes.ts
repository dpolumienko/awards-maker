import { tint as hex } from '~/utils/accent'

// Background themes for an awards page. Carried over from the original builder
// mockup, which had plain / stage / rays / glow, and extended to six. Every theme
// is built from the accent colour, so the two controls compose instead of
// fighting: pick a colour, pick how it fills the page.

export interface AwardTheme {
  id: string
  name: string
  free?: boolean
}

export const THEMES: AwardTheme[] = [
  { id: 'plain', name: 'Plain', free: true },
  { id: 'stage', name: 'Stage', },
  { id: 'rays', name: 'Rays' },
  { id: 'glow', name: 'Glow' },
  { id: 'spotlights', name: 'Beams' },
  { id: 'grid', name: 'Grid' },
]

// the page's own canvas, which is not the same black under every palette
const BASE = 'rgb(var(--canvas))'

/** Background for the cover band. `img` always wins - it is the streamer's own. */
export function themeCss(theme: string | undefined, accent: string, img?: string) {
  if (img) return `background-image:url(${img});background-size:cover;background-position:center`
  switch (theme) {
    case 'stage':
      return `background:radial-gradient(ellipse at 50% 130%, ${accent} 0%, ${hex(accent, '55')} 32%, ${BASE} 72%)`
    case 'rays':
      return `background:repeating-conic-gradient(from 200deg at 50% 115%, ${hex(accent, '40')} 0deg 6deg, ${BASE} 6deg 14deg)`
    case 'glow':
      return `background:radial-gradient(circle at 20% 25%, ${hex(accent, 'AA')}, transparent 45%), radial-gradient(circle at 80% 5%, ${hex(accent, '66')}, transparent 40%), linear-gradient(160deg, rgb(var(--s1)), ${BASE})`
    case 'spotlights':
      return `background:linear-gradient(105deg, transparent 12%, ${hex(accent, '33')} 20%, transparent 32%), linear-gradient(255deg, transparent 12%, ${hex(accent, '26')} 22%, transparent 34%), ${BASE}`
    case 'grid':
      return `background:linear-gradient(${hex(accent, '1A')} 1px, transparent 1px) 0 0/24px 24px, linear-gradient(90deg, ${hex(accent, '1A')} 1px, transparent 1px) 0 0/24px 24px, linear-gradient(180deg, ${hex(accent, '2E')}, ${BASE} 70%)`
    default:
      return `background:linear-gradient(135deg, ${hex(accent, '26')}, ${BASE})`
  }
}

/**
 * The cover band in the Fanzine version: the show's accent printed as a halftone
 * on paper. The gradients above are lights in a dark room and do not exist on a
 * printed page. A cover image is still the streamer's own and wins.
 */
export function zineCoverCss(accent: string, img?: string) {
  if (img) return `background-image:url(${img});background-size:cover;background-position:center`
  return `background:radial-gradient(circle, ${accent} 44%, transparent 47%) 0 0/8px 8px, rgb(var(--canvas))`
}

/**
 * The cream ticket of the Envelope version (review 2026-10-16): the same six
 * themes, drawn softly in the accent on warm off-white and brightest in the
 * bottom-right corner, the way the designer's prototype lights its card. Returns
 * the card's background (its --ap-bg). A cover image is still the streamer's own.
 */
export function envelopeCardCss(theme: string | undefined, accent: string, img?: string) {
  if (img) return `center/cover url(${img})`
  const B = '#F4EFE5', a = (alpha: string) => hex(accent, alpha), fade = `linear-gradient(120deg,${B} 18%,${hex(B, '00')} 70%)`
  const corner = (alpha: string) => `radial-gradient(ellipse 110% 140% at 100% 100%,${a(alpha)},${a('00')} 70%)`
  const layers: Record<string, string> = {
    plain: `radial-gradient(ellipse 120% 150% at var(--gx,100%) 100%,${a('44')},${a('00')} 70%)`,
    stage: `radial-gradient(ellipse 120% 150% at var(--gx,100%) 100%,${a('EE')},${a('88')} 22%,${a('33')} 50%,${a('00')} 80%)`,
    rays: `${fade},repeating-conic-gradient(from 180deg at 100% 100%,${a('55')} 0deg 4deg,${a('00')} 4deg 11deg),${corner('66')}`,
    // his "aurora" is what Glow is: soft lights pooled in the accent
    glow: `radial-gradient(55% 75% at 92% 18%,${a('77')},${a('00')} 62%),radial-gradient(60% 80% at 68% 105%,${a('AA')},${a('00')} 60%),radial-gradient(45% 60% at 40% 85%,${a('44')},${a('00')} 65%),radial-gradient(40% 55% at 100% 70%,${a('55')},${a('00')} 60%)`,
    // and his "ribbons" are Beams: light falling across the card at an angle
    spotlights: `${fade},repeating-linear-gradient(118deg,${a('00')} 0 34px,${a('33')} 34px 58px,${a('00')} 58px 92px,${a('66')} 92px 98px),${corner('44')}`,
    grid: `${fade},linear-gradient(${a('33')} 1px,${a('00')} 1px) 0 0/24px 24px,linear-gradient(90deg,${a('33')} 1px,${a('00')} 1px) 0 0/24px 24px,${corner('55')}`,
  }
  return `${layers[theme ?? 'plain'] ?? layers.plain},${B}`
}
