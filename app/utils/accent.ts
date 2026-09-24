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
  if (hex === DEFAULT_ACCENT) return 'rgb(var(--gold-text))'
  const rgb = toRgb(hex)
  if (!rgb) return hex
  if (contrast(rgb) >= FLOOR) return hex
  for (let mix = 0.05; mix <= 1; mix += 0.05) {
    const lifted = rgb.map((v) => v + (255 - v) * mix)
    if (contrast(lifted) >= FLOOR) return toHex(lifted)
  }
  return '#FFFFFF'
}

/**
 * A show with no colour of its own takes the site palette's accent, not a
 * fixed gold: under SC Blue a default show was still painted gold (review
 * 2026-09-24). It is a CSS expression, so the server renders the right colour
 * before any script runs and the design switcher repaints it live.
 */
export const DEFAULT_ACCENT = 'rgb(var(--gold))'

/** The show's accent: the streamer's own colour, or the palette's. */
export function accentOf(look?: { accent?: string } | null) {
  return look?.accent || DEFAULT_ACCENT
}

/** Type on an accent fill. */
export function onAccent(color: string) {
  return color === DEFAULT_ACCENT ? 'rgb(var(--on-gold))' : '#000'
}

/**
 * The accent at an opacity, given as the two hex digits the code used to glue
 * onto a #RRGGBB. Works for the palette's CSS expression too.
 */
export function tint(color: string, alphaHex: string) {
  if (/^#[\da-f]{6}$/i.test(color)) return color + alphaHex
  const pct = Math.round((parseInt(alphaHex, 16) / 255) * 100)
  return `color-mix(in srgb, ${color} ${pct}%, transparent)`
}

/**
 * A real #RRGGBB for places CSS variables cannot reach - a canvas. On the
 * server, or with no palette set, that is the gold.
 */
export function resolveAccent(color: string) {
  if (color !== DEFAULT_ACCENT) return color
  if (typeof document === 'undefined') return '#D9A441'
  const v = getComputedStyle(document.documentElement).getPropertyValue('--gold').trim().split(/\s+/).map(Number)
  return v.length === 3 && v.every((n) => Number.isFinite(n)) ? toHex(v) : '#D9A441'
}
