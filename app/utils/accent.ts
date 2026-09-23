// A streamer picks the accent colour; nobody picks it for contrast. Twitch purple
// (#9147FF) lands at 4.18:1 on our surfaces and #3B5BDB at 3.40:1, both under the
// 4.5:1 floor for body text - so the raw colour keeps painting fills, borders and
// bars, and text gets a lightened version of the same hue.

const SURFACE = [14, 14, 16] // #0E0E10, the darkest surface any accent text sits on
const FLOOR = 4.5

const channel = (v: number) => {
  const c = v / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}
const luminance = ([r, g, b]: number[]) =>
  0.2126 * channel(r!) + 0.7152 * channel(g!) + 0.0722 * channel(b!)

function contrast(rgb: number[]) {
  const a = luminance(rgb)
  const b = luminance(SURFACE)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

function toRgb(hex: string): number[] | null {
  const m = /^#?([a-f\d]{6})$/i.exec(hex.trim())
  if (!m) return null
  const n = parseInt(m[1]!, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

const toHex = (rgb: number[]) =>
  '#' + rgb.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('')

/** Does this colour carry small text on our surfaces? */
export function accentReadable(hex: string) {
  const rgb = toRgb(hex)
  return rgb ? contrast(rgb) >= FLOOR : true
}

/**
 * The same colour, lightened toward white just far enough to clear 4.5:1.
 * Hue and character survive; the text becomes readable.
 */
export function accentText(hex: string) {
  const rgb = toRgb(hex)
  if (!rgb) return hex
  if (contrast(rgb) >= FLOOR) return hex
  for (let mix = 0.05; mix <= 1; mix += 0.05) {
    const lifted = rgb.map((v) => v + (255 - v) * mix)
    if (contrast(lifted) >= FLOOR) return toHex(lifted)
  }
  return '#FFFFFF'
}
