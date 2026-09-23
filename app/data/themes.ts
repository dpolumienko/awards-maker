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

const hex = (c: string, alpha: string) => `${c}${alpha}`

/** Background for the cover band. `img` always wins - it is the streamer's own. */
export function themeCss(theme: string | undefined, accent: string, img?: string) {
  if (img) return `background-image:url(${img});background-size:cover;background-position:center`
  switch (theme) {
    case 'stage':
      return `background:radial-gradient(ellipse at 50% 130%, ${accent} 0%, ${hex(accent, '55')} 32%, #0E0E10 72%)`
    case 'rays':
      return `background:repeating-conic-gradient(from 200deg at 50% 115%, ${hex(accent, '40')} 0deg 6deg, #0E0E10 6deg 14deg)`
    case 'glow':
      return `background:radial-gradient(circle at 20% 25%, ${hex(accent, 'AA')}, transparent 45%), radial-gradient(circle at 80% 5%, ${hex(accent, '66')}, transparent 40%), linear-gradient(160deg, #17131F, #0E0E10)`
    case 'spotlights':
      return `background:linear-gradient(105deg, transparent 12%, ${hex(accent, '33')} 20%, transparent 32%), linear-gradient(255deg, transparent 12%, ${hex(accent, '26')} 22%, transparent 34%), #0E0E10`
    case 'grid':
      return `background:linear-gradient(${hex(accent, '1A')} 1px, transparent 1px) 0 0/24px 24px, linear-gradient(90deg, ${hex(accent, '1A')} 1px, transparent 1px) 0 0/24px 24px, linear-gradient(180deg, ${hex(accent, '2E')}, #0E0E10 70%)`
    default:
      return `background:linear-gradient(135deg, ${hex(accent, '26')}, #0E0E10)`
  }
}
