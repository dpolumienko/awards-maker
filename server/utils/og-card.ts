import { readFile } from 'node:fs/promises'
import { join, normalize, sep } from 'node:path'
import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'
import type { AwardRow } from './awards'

// The link card for a published awards, drawn on the server.
//
// A crawler never runs the page's JavaScript, so the canvas card in
// app/utils/shareCard.ts cannot be what an unfurl shows - and nuxt-og-image
// answers every URL with 400 on this stack (see scripts/gen-og.py). This is the
// same card, drawn the same way: the stage is the canvas `paintStage` redone as
// SVG, the type is laid out by satori, and resvg turns the lot into a PNG.
//
// Keep the two in step. A host who downloads their card and a friend who sees
// the link unfurl should be looking at one design.

export const OG = { w: 1200, h: 630 } as const

const GOLD = '#D9A441'
const INK = '#0E0E10'

// ---------------------------------------------------------------- fonts

interface FontFile {
  name: string
  weight: 400 | 500 | 600 | 700 | 800
  file: string
}

// Every subset file is its own family name. Satori resolves a family to one
// file and does not look for a missing glyph in a second file of the same name,
// so "Archivo" twice drew a Polish Ł as a box; "Archivo" plus "Archivo Ext" in
// the font-family chain does not. The display faces other than Playfair have no
// Cyrillic at all, which is what Noto Sans at the end of every chain is for.
const subsetName = (face: string, subset: string) =>
  subset === 'latin' ? face : `${face} ${subset === 'latin-ext' ? 'Ext' : subset === 'cyrillic' ? 'Cyr' : 'CyrExt'}`

const FONT_FILES: FontFile[] = [
  ...(['latin', 'latin-ext'] as const).flatMap((s) => [
    { name: subsetName('Archivo', s), weight: 500 as const, file: `archivo-${s}-500-normal.woff` },
    { name: subsetName('Archivo', s), weight: 600 as const, file: `archivo-${s}-600-normal.woff` },
    { name: subsetName('Archivo', s), weight: 800 as const, file: `archivo-${s}-800-normal.woff` },
    { name: subsetName('Anton', s), weight: 400 as const, file: `anton-${s}-400-normal.woff` },
    { name: subsetName('Playfair Display', s), weight: 800 as const, file: `playfair-display-${s}-800-normal.woff` },
    { name: subsetName('Space Grotesk', s), weight: 700 as const, file: `space-grotesk-${s}-700-normal.woff` },
  ]),
  { name: 'Playfair Display Cyr', weight: 800, file: 'playfair-display-cyrillic-800-normal.woff' },
  ...(['cyrillic', 'cyrillic-ext'] as const).flatMap((s) => [
    { name: subsetName('Noto Sans', s), weight: 500 as const, file: `noto-sans-${s}-500-normal.woff` },
    { name: subsetName('Noto Sans', s), weight: 600 as const, file: `noto-sans-${s}-600-normal.woff` },
    { name: subsetName('Noto Sans', s), weight: 800 as const, file: `noto-sans-${s}-800-normal.woff` },
  ]),
]

/** A face, its own extra subsets, then Archivo and Noto Sans to catch the rest. */
const chain = (face: string) =>
  [...new Set([face, `${face} Ext`, `${face} Cyr`, 'Archivo', 'Archivo Ext', 'Noto Sans Cyr', 'Noto Sans CyrExt'])].join(', ')

type SatoriFont = { name: string; data: ArrayBuffer | Buffer; weight: FontFile['weight']; style: 'normal' }
let fonts: Promise<SatoriFont[]> | null = null

/** server/assets is bundled into the build by Nitro, so this works from .output too. */
function loadFonts(): Promise<SatoriFont[]> {
  fonts ??= Promise.all(
    FONT_FILES.map(async (f) => {
      const raw = await useStorage('assets:server').getItemRaw(`fonts/${f.file}`)
      if (!raw) throw new Error(`og-card: font ${f.file} is missing from server/assets/fonts`)
      return { name: f.name, data: Buffer.from(raw as ArrayBuffer), weight: f.weight, style: 'normal' as const }
    }),
  ).catch((error) => {
    fonts = null
    throw error
  })
  return fonts
}

/** The display faces the builder offers; anything else draws in Archivo. */
const DISPLAY: Record<string, { family: string; weight: FontFile['weight']; em: number }> = {
  Archivo: { family: 'Archivo', weight: 800, em: 0.7 },
  Anton: { family: 'Anton', weight: 400, em: 0.5 },
  'Playfair Display': { family: 'Playfair Display', weight: 800, em: 0.72 },
  'Space Grotesk': { family: 'Space Grotesk', weight: 700, em: 0.68 },
}

// ---------------------------------------------------------------- stage

/** Only a plain #RRGGBB reaches the SVG - `look` is host input. */
export function safeAccent(value: unknown): string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : GOLD
}

/**
 * `paintStage` from app/utils/shareCard.ts, as SVG. The canvas version writes
 * alpha as a hex suffix on the accent (`${accent}AA`); here it is the matching
 * stop-opacity, so the numbers below are those suffixes over 255.
 */
export function stageSvg(theme: unknown, accent: string, w = OG.w, h = OG.h): string {
  const max = Math.max(w, h)
  const radial = (id: string, cx: number, cy: number, r: number, opacity: number) =>
    `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${r}">` +
    `<stop offset="0" stop-color="${accent}" stop-opacity="${opacity}"/>` +
    `<stop offset="1" stop-color="${INK}" stop-opacity="0"/></radialGradient>`
  const fill = (id: string) => `<rect width="${w}" height="${h}" fill="url(#${id})"/>`

  let defs = ''
  let body = ''
  switch (theme) {
    case 'stage':
      defs = radial('a', w / 2, h * 1.25, max * 1.1, 1)
      body = fill('a')
      break
    case 'glow':
      defs = radial('a', w * 0.2, h * 0.25, max * 0.75, 0xaa / 255) + radial('b', w * 0.85, h * 0.05, max * 0.6, 0x66 / 255)
      body = fill('a') + fill('b')
      break
    case 'rays': {
      const wedges: string[] = []
      for (let i = 0; i < 24; i++) {
        if (i % 2 === 0) continue
        wedges.push(
          `<polygon transform="rotate(${((i + 1) * 360) / 24})" points="0,0 ${-w},${-h * 2} ${w * 0.35},${-h * 2}"/>`,
        )
      }
      body = `<g transform="translate(${w / 2} ${h * 1.15})" fill="${accent}" fill-opacity="${0x30 / 255}">${wedges.join('')}</g>`
      break
    }
    case 'spotlights':
      defs =
        `<linearGradient id="a" gradientUnits="userSpaceOnUse" x1="0" y1="${h}" x2="${w}" y2="0">` +
        [
          [0.12, 0],
          [0.3, 0x33],
          [0.48, 0],
          [0.68, 0x26],
          [0.86, 0],
        ]
          .map(([o, a]) => `<stop offset="${o}" stop-color="${a ? accent : INK}" stop-opacity="${a ? a / 255 : 0}"/>`)
          .join('') +
        `</linearGradient>`
      body = fill('a')
      break
    case 'grid': {
      const step = Math.round(w / 26)
      const lines: string[] = []
      for (let x = 0; x < w; x += step) lines.push(`M${x} 0V${h}`)
      for (let y = 0; y < h; y += step) lines.push(`M0 ${y}H${w}`)
      defs = radial('a', w / 2, 0, max, 0x2e / 255)
      body = `<path d="${lines.join('')}" stroke="${accent}" stroke-opacity="${0x22 / 255}" stroke-width="2" fill="none"/>` + fill('a')
      break
    }
    default:
      defs =
        `<linearGradient id="a" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${w}" y2="${h}">` +
        `<stop offset="0" stop-color="${accent}" stop-opacity="${0x26 / 255}"/>` +
        `<stop offset="1" stop-color="${INK}"/></linearGradient>`
      body = fill('a')
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<defs>${defs}</defs><rect width="${w}" height="${h}" fill="${INK}"/>${body}</svg>`
  )
}

/**
 * An uploaded cover as a data URL, or null. Only PNG and JPEG: resvg decodes
 * nothing else, and a WebP cover that silently drew as a black box would be
 * worse than the theme it replaces.
 */
async function coverDataUrl(coverUrl: unknown): Promise<string | null> {
  if (typeof coverUrl !== 'string' || !coverUrl.startsWith('/uploads/')) return null
  const root = normalize(String(useRuntimeConfig().uploadsDir))
  const file = normalize(join(root, coverUrl.slice('/uploads/'.length)))
  if (!file.startsWith(root.endsWith(sep) ? root : root + sep)) return null

  const buf = await readFile(file).catch(() => null)
  if (!buf) return null
  if (buf.subarray(0, 8).toString('hex') === '89504e470d0a1a0a') return `data:image/png;base64,${buf.toString('base64')}`
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return `data:image/jpeg;base64,${buf.toString('base64')}`
  return null
}

// ---------------------------------------------------------------- copy

export interface OgCardCopy {
  kicker: string
  headline: string
  sub: string
  cta: string
  url: string
}

const fmt = (d: string | null) =>
  d ? new Date(`${String(d).slice(0, 10)}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }) : ''

/**
 * The host card's wording from shareCard.ts `cardCopy('host')`, plus the one
 * thing a link preview needs that a downloaded card does not: what the link is
 * for right now. A show that is open asks for a vote; one with winners out
 * offers them.
 */
export function ogCopy(
  award: Pick<AwardRow, 'name' | 'host_name' | 'slug' | 'closes_at' | 'ceremony_at' | 'closed_at' | 'results_at' | 'opens_at'>,
  categories: number,
  siteUrl: string,
  now = new Date(),
): OgCardCopy {
  const closes = fmt(award.closes_at)
  const closedByDate = award.closes_at && new Date(`${String(award.closes_at).slice(0, 10)}T23:59:59`) < now
  const notOpen = award.opens_at && new Date(`${String(award.opens_at).slice(0, 10)}T00:00:00`) > now
  const cats = `${categories} ${categories === 1 ? 'category' : 'categories'}`

  let sub: string
  let cta: string
  if (award.results_at) {
    sub = `Winners announced · ${cats}`
    cta = 'See the winners'
  } else if (award.closed_at || closedByDate) {
    sub = award.ceremony_at ? `Voting closed · winners on ${fmt(award.ceremony_at)}` : 'Voting closed · winners coming'
    cta = ''
  } else if (notOpen) {
    sub = `${cats}, voted by chat · opens ${fmt(award.opens_at)}`
    cta = ''
  } else {
    sub = `${cats}, voted by chat${closes ? ` · closes ${closes}` : ''}`
    cta = 'Vote now'
  }

  const host = siteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')
  return {
    kicker: `${award.host_name} presents`,
    headline: award.name,
    sub,
    cta,
    url: `${host}/a/${award.slug}`,
  }
}

// ---------------------------------------------------------------- layout

type Node = { type: string; props: Record<string, unknown> & { style?: Record<string, unknown>; children?: unknown } }
const el = (type: string, style: Record<string, unknown>, children?: unknown, extra: Record<string, unknown> = {}): Node => ({
  type,
  props: { style, children, ...extra },
})

/** Greedy wrap by estimated advance width - satori lays out, but will not tell us the line count. */
function estimateLines(text: string, size: number, em: number, maxWidth: number): number {
  const words = text.split(/\s+/).filter(Boolean)
  let lines = 1
  let width = 0
  for (const word of words) {
    const w = word.length * size * em
    const next = width ? width + size * em * 0.5 + w : w
    if (next > maxWidth && width) {
      lines++
      width = w
    } else {
      width = next
    }
  }
  return lines
}

export interface OgCardInput {
  copy: OgCardCopy
  look: Record<string, unknown>
}

/** The card as a PNG. */
export async function renderOgCard({ copy, look }: OgCardInput): Promise<Buffer> {
  const { w, h } = OG
  const accent = safeAccent(look.accent)
  const display = DISPLAY[String(look.font ?? '')] ?? DISPLAY.Archivo!

  // Same measurements as the canvas card at 1200 wide.
  const pad = Math.round(w * 0.075)
  const body = Math.round(w * 0.028)
  const footTop = h - pad - body * 1.4
  const available = footTop - (pad + body * 2.4)
  const subLines = copy.sub ? Math.min(2, estimateLines(copy.sub, body, 0.52, w - pad * 2)) : 0
  const rest = (subLines ? subLines * Math.round(body * 1.35) + body * 0.6 : 0) + (copy.cta ? Math.round(body * 2.2) : 0)

  const headline = copy.headline.toUpperCase()
  let size = Math.round(w * 0.078)
  for (; size > body * 1.2; size -= 4) {
    const lines = estimateLines(headline, size, display.em, w - pad * 2)
    if (lines <= 4 && lines * Math.round(size * 1.02) + rest <= available) break
  }

  const cover = await coverDataUrl(look.coverUrl)
  const stage = `data:image/svg+xml;base64,${Buffer.from(stageSvg(look.theme, accent)).toString('base64')}`
  const text = (weight: number, px: number, color: string, extra: Record<string, unknown> = {}) => ({
    fontFamily: chain('Archivo'),
    fontWeight: weight,
    fontSize: px,
    color,
    ...extra,
  })

  const tree = el(
    'div',
    { width: w, height: h, display: 'flex', position: 'relative', backgroundColor: INK },
    [
      el('img', { position: 'absolute', left: 0, top: 0, width: w, height: h, objectFit: 'cover' }, undefined, {
        src: cover ?? stage,
        width: w,
        height: h,
      }),
      // scrim, heavier at the bottom where the small type sits
      el('div', {
        position: 'absolute',
        left: 0,
        top: 0,
        width: w,
        height: h,
        backgroundImage: 'linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.78) 100%)',
      }),
      el(
        'div',
        {
          position: 'absolute',
          left: pad,
          top: pad,
          right: pad,
          display: 'flex',
          ...text(800, Math.round(body * 1.5), accent, { letterSpacing: 4, lineHeight: 1 }),
        },
        copy.kicker.toUpperCase(),
      ),
      el(
        'div',
        {
          position: 'absolute',
          left: pad,
          right: pad,
          bottom: h - footTop,
          display: 'flex',
          flexDirection: 'column',
        },
        [
          el(
            'div',
            {
              display: 'flex',
              fontFamily: chain(display.family),
              fontWeight: display.weight,
              fontSize: size,
              lineHeight: 1.02,
              color: '#FFFFFF',
            },
            headline,
          ),
          copy.sub
            ? el('div', { display: 'flex', marginTop: Math.round(body * 0.6), ...text(500, body, '#A5A5AC', { lineHeight: 1.35 }) }, copy.sub)
            : null,
          copy.cta
            ? el('div', { display: 'flex', marginTop: Math.round(body * 0.5), ...text(800, Math.round(body * 1.25), '#FFFFFF') }, copy.cta.toUpperCase())
            : null,
        ].filter(Boolean),
      ),
      // footer: a dot in the accent and the address
      el(
        'div',
        { position: 'absolute', left: pad, bottom: pad, display: 'flex', alignItems: 'center', ...text(600, body, '#FFFFFF', { lineHeight: 1 }) },
        [
          el('div', { flexShrink: 0, width: Math.round(body * 0.56), height: Math.round(body * 0.56), borderRadius: 999, backgroundColor: accent, marginRight: Math.round(body * 0.54) }),
          // a 60-character slug runs off the card; the start of it is what identifies the show
          el('div', { display: 'block', maxWidth: w - pad * 2 - body * 1.1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }, copy.url),
        ],
      ),
    ],
  )

  const svg = await satori(tree as never, { width: w, height: h, fonts: await loadFonts() })
  return new Resvg(svg, { fitTo: { mode: 'width', value: w } }).render().asPng()
}
