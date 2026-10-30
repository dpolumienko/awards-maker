import { tint as hex } from '~/utils/accent'
import type { CustomBg } from '~/types/award'

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

/**
 * The Envelope builder (Ed's prototype, 2026-10-22): the page as a dark room lit
 * from the top in the show's accent, the pattern brightest where the light falls.
 * Ten themes: the six above under the prototype's names, three more, and Custom -
 * the host's own pattern, built in the Look step (look.bg).
 */
export const ENV_THEMES: AwardTheme[] = [
  { id: 'plain', name: 'Plain', free: true },
  { id: 'stage', name: 'Spotlight' },
  { id: 'glow', name: 'Aurora' },
  { id: 'rays', name: 'Sunburst' },
  { id: 'waves', name: 'Ripples' },
  { id: 'confetti', name: 'Lights' },
  { id: 'halftone', name: 'Halftone' },
  { id: 'spotlights', name: 'Light leaks' },
  { id: 'grid', name: 'Grid' },
  { id: 'custom', name: 'Custom' },
]

export type { CustomBg }
export const DEFAULT_BG: CustomBg = { pattern: 'rays', strength: 55, size: 50, angle: 20, glow: 'top', glowStrength: 60 }

const h2 = (x: number) => Math.round(Math.max(0, Math.min(1, x)) * 255).toString(16).padStart(2, '0')

/** The Custom theme's layers. */
export function customBgCss(bg: CustomBg | undefined, accent: string) {
  const b = { ...DEFAULT_BG, ...(bg ?? {}) }
  const c = b.color || accent, k = b.strength / 100, z = b.size, an = b.angle
  const t = (x: number) => hex(c, h2(x * k))
  const patterns: Record<CustomBg['pattern'], string> = {
    none: '',
    rays: `repeating-conic-gradient(from ${an}deg at 50% -10%,${t(0.55)} 0deg 3deg,${hex(c, '00')} 3deg ${4 + z / 6}deg)`,
    rings: `repeating-radial-gradient(circle at 50% -10%,${t(0.6)} 0 2px,${hex(c, '00')} 2.5px ${12 + z * 0.9}px)`,
    dots: `radial-gradient(circle,${t(0.8)} 1.6px,${hex(c, '00')} 2.2px) 0 0/${8 + z / 4}px ${8 + z / 4}px`,
    grid: `linear-gradient(${t(0.45)} 1px,${hex(c, '00')} 1px) 0 0/${12 + z * 0.6}px ${12 + z * 0.6}px,linear-gradient(90deg,${t(0.45)} 1px,${hex(c, '00')} 1px) 0 0/${12 + z * 0.6}px ${12 + z * 0.6}px`,
    stripes: `repeating-linear-gradient(${an + 90}deg,${hex(c, '00')} 0 ${8 + z * 0.6}px,${t(0.4)} ${8 + z * 0.6}px ${14 + z}px)`,
    bokeh: [[14, 24], [32, 10], [48, 34], [66, 16], [80, 40], [92, 14], [24, 62], [58, 56], [86, 70]]
      .map(([x, y], i) => `radial-gradient(circle at ${x}% ${y}%,${t(0.45 - i * 0.03)} 0,${t(0.45 - i * 0.03)} ${(2 + z / 14) * 0.4}%,${hex(c, '00')} ${2 + z / 14}%)`)
      .join(','),
  }
  const pos = { top: '50% 0%', corner: '100% 0%', center: '50% 55%', bottom: '50% 100%', none: '' }[b.glow]
  const g = pos ? `radial-gradient(80% 85% at ${pos},${hex(accent, h2(0.75 * b.glowStrength / 100))},${hex(accent, '00')} 72%)` : ''
  return [patterns[b.pattern], g].filter(Boolean).join(',')
}

/** The dark Envelope page background: the theme's pattern, then the light from the top. */
// `lit`: the vertical wash of accent from the top. Swatches and the builder preview
// keep it so a small tile reads; the full awards page leaves it off - over a whole
// hero it blew the top out (Ed, 2026-10-22).
export function envelopeDarkCss(theme: string | undefined, accent: string, img?: string, bg?: CustomBg, lit = true) {
  if (img) return `center/cover no-repeat url(${img})`
  const a = (alpha: string) => hex(accent, alpha)
  const fade = 'linear-gradient(120deg,#0B0B0A 10%,#0B0B0A00 62%)'
  const lights = [[14, 28, 7, '55'], [30, 12, 4, '40'], [46, 34, 9, '2E'], [63, 16, 5, '4D'], [78, 40, 8, '38'], [90, 18, 4, '55'], [24, 62, 6, '33'], [56, 58, 10, '24'], [84, 70, 5, '40'], [8, 80, 4, '2E'], [38, 84, 7, '26'], [70, 92, 6, '30']] as const
  const layers: Record<string, string> = {
    plain: `radial-gradient(ellipse 120% 150% at 100% 100%,${a('26')},${a('00')} 60%)`,
    stage: `radial-gradient(ellipse 55% 40% at 50% -2%,${a('F0')},${a('99')} 35%,${a('00')} 72%),conic-gradient(from -14deg at 50% 112%,${a('00')} 0deg,${a('40')} 9deg,${a('70')} 14deg,${a('40')} 19deg,${a('00')} 28deg,${a('00')} 360deg)`,
    glow: `radial-gradient(60% 34% at 28% 26%,${a('88')},${a('00')} 70%),radial-gradient(48% 30% at 74% 48%,${a('66')},${a('00')} 72%),radial-gradient(30% 40% at 92% 12%,${a('88')},${a('00')} 70%)`,
    rays: `${fade},repeating-conic-gradient(from 180deg at 100% 100%,${a('55')} 0deg 4deg,${a('00')} 4deg 11deg)`,
    waves: `${fade},repeating-radial-gradient(circle at 100% 100%,${a('66')} 0 2px,${a('00')} 2.5px 26px)`,
    confetti: lights.map(([x, y, r, o]) => `radial-gradient(circle at ${x}% ${y}%,${a(o)} 0,${a(o)} ${r * 0.35}%,${a('00')} ${r}%)`).join(','),
    halftone: `${fade},radial-gradient(circle,${a('AA')} 1.6px,${a('00')} 2.1px) 0 0/12px 12px`,
    spotlights: `linear-gradient(112deg,${a('00')} 18%,${a('70')} 28%,${a('00')} 38%),linear-gradient(112deg,#F6F4EE00 40%,#F6F4EE30 47%,#F6F4EE00 54%),linear-gradient(122deg,${a('00')} 56%,${a('5C')} 66%,${a('00')} 78%)`,
    grid: `${fade},linear-gradient(${a('33')} 1px,${a('00')} 1px) 0 0/24px 24px,linear-gradient(90deg,${a('33')} 1px,${a('00')} 1px) 0 0/24px 24px`,
  }
  const pattern = theme === 'custom' ? customBgCss(bg, accent) : layers[theme ?? 'plain'] ?? layers.plain
  const top = theme === 'custom' || !lit ? '' : `,linear-gradient(180deg,${a('A8')} 0%,${a('52')} 34%,${a('1A')} 62%,${a('00')} 85%)`
  return `${pattern}${top},#0B0B0A`
}
