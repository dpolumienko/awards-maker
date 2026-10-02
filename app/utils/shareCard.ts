import qrcode from 'qrcode-generator'
import { accentOf, accentText, resolveAccent } from './accent'
import type { Award, AwardLook } from '~/types/award'

/**
 * Share cards, drawn in the browser on a canvas.
 *
 * Not nuxt-og-image: that module answers every image URL with 400 on this stack
 * (see docs-auto/lessons). Not a screenshot service either - a card has to be
 * downloadable the second a nominee sees it, and the page already holds
 * everything the card needs, including the cover as a data URL.
 *
 * The same drawing runs for every role and every category; what changes is the
 * three lines of text it is handed.
 */

export type ShareRole = 'host' | 'nominee' | 'voter' | 'winner'
export type ShareFormat = 'link' | 'story'

export interface CardSpec {
  role: ShareRole
  /** Small line above the headline: who is speaking. */
  kicker: string
  /** The line that does the work. */
  headline: string
  /** Context under it - the category, the date, the channel. */
  sub?: string
  /** The line that asks for the click, where the role has one to ask for. */
  cta?: string
  /** Bottom left, always: where to go. */
  url: string
  look: AwardLook
  format: ShareFormat
  /** The Fanzine version's flyer instead of the stage card (renderZineCard). */
  zine?: boolean
  /** The full address the flyer's QR code opens; `url` is the one printed. */
  href?: string
}

export const FORMATS: Record<ShareFormat, { w: number; h: number; name: string; note: string }> = {
  link: { w: 1200, h: 630, name: 'Link card', note: 'X, Discord, any link preview' },
  story: { w: 1080, h: 1920, name: 'Story', note: 'Instagram, TikTok, YouTube' },
}


/** The page themes, redrawn with canvas gradients instead of CSS ones. */
function paintStage(ctx: CanvasRenderingContext2D, look: AwardLook, w: number, h: number) {
  const accent = resolveAccent(accentOf(look))
  ctx.fillStyle = '#0E0E10'
  ctx.fillRect(0, 0, w, h)

  const radial = (x: number, y: number, r: number, inner: string, outer: string) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, inner)
    g.addColorStop(1, outer)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
  }

  switch (look.theme) {
    case 'stage':
      radial(w / 2, h * 1.25, Math.max(w, h) * 1.1, accent, 'rgba(14,14,16,0)')
      break
    case 'glow':
      radial(w * 0.2, h * 0.25, Math.max(w, h) * 0.75, `${accent}AA`, 'rgba(14,14,16,0)')
      radial(w * 0.85, h * 0.05, Math.max(w, h) * 0.6, `${accent}66`, 'rgba(14,14,16,0)')
      break
    case 'rays': {
      ctx.save()
      ctx.translate(w / 2, h * 1.15)
      for (let i = 0; i < 24; i++) {
        ctx.rotate((Math.PI * 2) / 24)
        ctx.fillStyle = i % 2 ? `${accent}30` : 'rgba(14,14,16,0)'
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.lineTo(-w, -h * 2)
        ctx.lineTo(w * 0.35, -h * 2)
        ctx.closePath()
        ctx.fill()
      }
      ctx.restore()
      break
    }
    case 'spotlights': {
      const beam = ctx.createLinearGradient(0, h, w, 0)
      beam.addColorStop(0.12, 'rgba(14,14,16,0)')
      beam.addColorStop(0.3, `${accent}33`)
      beam.addColorStop(0.48, 'rgba(14,14,16,0)')
      beam.addColorStop(0.68, `${accent}26`)
      beam.addColorStop(0.86, 'rgba(14,14,16,0)')
      ctx.fillStyle = beam
      ctx.fillRect(0, 0, w, h)
      break
    }
    case 'grid': {
      ctx.strokeStyle = `${accent}22`
      ctx.lineWidth = 2
      const step = Math.round(w / 26)
      for (let x = 0; x < w; x += step) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, h)
        ctx.stroke()
      }
      for (let y = 0; y < h; y += step) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
        ctx.stroke()
      }
      radial(w / 2, 0, Math.max(w, h), `${accent}2E`, 'rgba(14,14,16,0)')
      break
    }
    default: {
      const flat = ctx.createLinearGradient(0, 0, w, h)
      flat.addColorStop(0, `${accent}26`)
      flat.addColorStop(1, '#0E0E10')
      ctx.fillStyle = flat
      ctx.fillRect(0, 0, w, h)
    }
  }
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number) {
  const scale = Math.max(w / img.width, h / img.height)
  const dw = img.width * scale
  const dh = img.height * scale
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh)
}

const loadImage = (src: string) =>
  new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })

/** Greedy wrap, returning the lines rather than drawing them - the caller needs the count. */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = next
    }
  }
  if (line) lines.push(line)
  return lines
}

/**
 * Draws one card and hands back a PNG data URL.
 * Fonts have to be ready first, or the headline is measured in a fallback face
 * and wraps in the wrong place.
 */
export async function renderShareCard(spec: CardSpec): Promise<string> {
  if (spec.zine) return renderZineCard(spec)
  const { w, h } = FORMATS[spec.format]
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  const accent = resolveAccent(accentOf(spec.look))
  const display = spec.look.font ? `'${spec.look.font}'` : 'Archivo'
  const story = spec.format === 'story'

  // `fonts.ready` only settles what the page already uses; the display face has to
  // be asked for by name or the first card draws in the fallback and the rest do not.
  try {
    if (spec.look.font) await document.fonts.load(`800 100px ${display}`)
    await document.fonts.load('800 100px Archivo')
  } catch {
    /* a face that will not load simply falls back */
  }
  await document.fonts.ready

  if (spec.look.coverUrl) {
    const img = await loadImage(spec.look.coverUrl)
    if (img) drawCover(ctx, img, w, h)
    else paintStage(ctx, spec.look, w, h)
  } else {
    paintStage(ctx, spec.look, w, h)
  }

  // scrim, heavier at the bottom where the small type sits
  const scrim = ctx.createLinearGradient(0, 0, 0, h)
  scrim.addColorStop(0, 'rgba(0,0,0,0.45)')
  scrim.addColorStop(1, 'rgba(0,0,0,0.78)')
  ctx.fillStyle = scrim
  ctx.fillRect(0, 0, w, h)

  const pad = Math.round(w * 0.075)
  const bodySize = Math.round(w * (story ? 0.033 : 0.028))

  // The claim - "I am nominated", "I voted", "Winner" - is what the card is for.
  // It used to be a 20px eyebrow under a headline four times its size, so every
  // card read as the same shout of the show's name.
  ctx.fillStyle = accent
  ctx.font = `800 ${Math.round(bodySize * 1.5)}px Archivo, sans-serif`
  ctx.textBaseline = 'top'
  ctx.letterSpacing = '4px'
  ctx.fillText(spec.kicker.toUpperCase(), pad, pad)
  ctx.letterSpacing = '0px'

  // The block is laid out against the footer, not from the middle: with a long
  // category and a call to action the old version drew the CTA straight through
  // the address line.
  const footTop = h - pad - bodySize * 1.4
  const available = footTop - (pad + bodySize * 2.4)

  let size = Math.round(w * (story ? 0.095 : 0.078))
  let lines: string[] = []
  let subLines: string[] = []
  let blockHeight = 0

  for (; size > bodySize * 1.2; size -= 4) {
    ctx.font = `800 ${size}px ${display}, Archivo, sans-serif`
    lines = wrap(ctx, spec.headline.toUpperCase(), w - pad * 2)
    ctx.font = `500 ${bodySize}px Archivo, sans-serif`
    subLines = spec.sub ? wrap(ctx, spec.sub, w - pad * 2).slice(0, 2) : []
    blockHeight =
      lines.length * Math.round(size * 1.02) +
      (subLines.length ? subLines.length * Math.round(bodySize * 1.35) + bodySize * 0.6 : 0) +
      (spec.cta ? Math.round(bodySize * 2.2) : 0)
    if (lines.length <= 4 && blockHeight <= available) break
  }

  const lineHeight = Math.round(size * 1.02)
  let y = story ? Math.max(pad + bodySize * 3, footTop - blockHeight - bodySize) : footTop - blockHeight

  ctx.fillStyle = '#FFFFFF'
  ctx.font = `800 ${size}px ${display}, Archivo, sans-serif`
  for (const line of lines) {
    ctx.fillText(line, pad, y)
    y += lineHeight
  }

  if (subLines.length) {
    ctx.fillStyle = '#A5A5AC'
    ctx.font = `500 ${bodySize}px Archivo, sans-serif`
    y += Math.round(bodySize * 0.6)
    for (const line of subLines) {
      ctx.fillText(line, pad, y)
      y += Math.round(bodySize * 1.35)
    }
  }

  if (spec.cta) {
    ctx.fillStyle = '#FFFFFF'
    ctx.font = `800 ${Math.round(bodySize * 1.25)}px Archivo, sans-serif`
    y += Math.round(bodySize * 0.5)
    ctx.fillText(spec.cta.toUpperCase(), pad, y)
  }

  // footer: a dot in the accent and the address
  const footY = h - pad - bodySize
  ctx.fillStyle = accent
  ctx.beginPath()
  ctx.arc(pad + bodySize * 0.28, footY + bodySize * 0.55, bodySize * 0.28, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#FFFFFF'
  ctx.font = `600 ${bodySize}px Archivo, sans-serif`
  ctx.fillText(spec.url, pad + bodySize * 1.1, footY)

  return canvas.toDataURL('image/png')
}

const PAPER = '#FAFAF7'
const INK = '#1D1D1F'
const INK_2 = '#4B4B52'
const PINK = '#FF48B0'

/** A QR code drawn straight onto the canvas, dark modules on a white square. */
function drawQr(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number) {
  const qr = qrcode(0, 'M')
  qr.addData(text)
  qr.make()
  const n = qr.getModuleCount()
  const quiet = 2
  const cell = size / (n + quiet * 2)
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(x, y, size, size)
  ctx.fillStyle = INK
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      if (qr.isDark(r, c)) ctx.fillRect(x + (c + quiet) * cell, y + (r + quiet) * cell, Math.ceil(cell), Math.ceil(cell))
}

/** The pen circle, by hand: an ellipse that runs a quarter past where it started. */
function drawPen(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, width: number) {
  ctx.save()
  ctx.strokeStyle = PINK
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.globalCompositeOperation = 'multiply'
  ctx.beginPath()
  ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, -0.04, Math.PI * 0.95, Math.PI * 0.95 + Math.PI * 2.35)
  ctx.stroke()
  ctx.restore()
}

/**
 * The Fanzine's share card: a flyer. Paper, the claim printed on two plates, the
 * name in black ink (circled when it won), and a tear-off strip at the foot with
 * a QR code that opens the awards page - a card on a stream is scanned as often
 * as it is tapped.
 */
async function renderZineCard(spec: CardSpec): Promise<string> {
  const { w, h } = FORMATS[spec.format]
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  const story = spec.format === 'story'
  const blue = resolveAccent(accentOf(spec.look))
  const blueInk = accentText(blue, true)
  // the width goes in the font string: assigning ctx.font resets ctx.fontStretch
  const display = spec.look.font ? `900 SIZEpx '${spec.look.font}', Anybody, Archivo, sans-serif` : '900 expanded SIZEpx Anybody, Archivo, sans-serif'
  const face = (px: number) => display.replace('SIZE', String(px))
  try {
    await Promise.all([
      document.fonts.load('900 100px Anybody'),
      document.fonts.load('700 40px "Schibsted Grotesk"'),
      spec.look.font ? document.fonts.load(`800 100px '${spec.look.font}'`) : null,
    ])
  } catch {
    /* a face that will not load simply falls back */
  }
  await document.fonts.ready

  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, w, h)
  const pad = Math.round(w * 0.07)
  const body = Math.round(w * (story ? 0.032 : 0.022))
  const tearH = Math.round(story ? h * 0.2 : h * 0.3)
  const tearTop = h - tearH
  ctx.textBaseline = 'top'

  // who is speaking, small, as the masthead line
  ctx.fillStyle = INK
  ctx.font = `700 ${body}px "Schibsted Grotesk", Archivo, sans-serif`
  ctx.letterSpacing = '3px'
  ctx.fillText(spec.kicker.toUpperCase(), pad, pad)
  ctx.letterSpacing = '0px'

  // the claim on two plates: the first ink, then pink multiplied a few pixels off
  const claim = ({ host: 'Vote now', nominee: 'Nominated', voter: 'I voted', winner: 'Winner' } as const)[spec.role].toUpperCase()
  let claimSize = Math.round(w * (story ? 0.15 : 0.1))
  for (; claimSize > body * 2; claimSize -= 4) {
    ctx.font = `900 expanded ${claimSize}px Anybody, Archivo, sans-serif`
    if (ctx.measureText(claim).width <= w - pad * 2) break
  }
  const claimY = pad + body * 2.2
  ctx.fillStyle = blue
  ctx.fillText(claim, pad, claimY)
  ctx.globalCompositeOperation = 'multiply'
  ctx.fillStyle = PINK
  ctx.fillText(claim, pad + claimSize * 0.045, claimY + claimSize * 0.035)
  ctx.globalCompositeOperation = 'source-over'

  // the name in black ink, as big as the room under the claim allows
  const top = claimY + claimSize * 1.2
  const bottom = tearTop - body * 1.6
  let size = Math.round(w * (story ? 0.2 : 0.08))
  let lines: string[] = []
  let subLines: string[] = []
  let block = 0
  for (; size > body * 1.3; size -= 4) {
    ctx.font = face(size)
    lines = wrap(ctx, spec.headline, w - pad * 2)
    // one long word does not wrap: it has to fit on its own
    const fits = lines.every((l) => ctx.measureText(l).width <= w - pad * 2)
    ctx.font = `600 ${body}px "Schibsted Grotesk", Archivo, sans-serif`
    subLines = spec.sub ? wrap(ctx, spec.sub, w - pad * 2).slice(0, 2) : []
    block = lines.length * size * 0.98 + subLines.length * body * 1.4 + body + (spec.cta ? body * 3 : 0)
    if (fits && lines.length <= 3 && block <= bottom - top) break
  }
  // a story is tall: the name sits down on the tear-off strip, not under the claim
  let y = story ? Math.max(top, bottom - block) : top
  // the room a story leaves between the claim and the name is a halftone of the
  // first ink - the riso's way of laying a tint; nothing is printed over the dots
  if (story && y - top > size) {
    const step = Math.round(w * 0.012)
    ctx.fillStyle = blue
    for (let dy = top; dy < y - size * 0.35; dy += step)
      for (let dx = pad; dx < w - pad; dx += step) {
        ctx.beginPath()
        ctx.arc(dx + step / 2, dy + step / 2, step * 0.3, 0, Math.PI * 2)
        ctx.fill()
      }
  }
  ctx.fillStyle = INK
  ctx.font = face(size)
  lines.forEach((line, i) => {
    ctx.fillText(line, pad, y)
    if (spec.role === 'winner' && i === 0) {
      const lw = ctx.measureText(line).width
      drawPen(ctx, pad - size * 0.25, y - size * 0.22, lw + size * 0.5, size * 1.3, Math.max(4, size * 0.06))
    }
    y += size * 0.98
  })
  if (subLines.length) {
    y += body * 0.6
    ctx.fillStyle = INK_2
    ctx.font = `600 ${body}px "Schibsted Grotesk", Archivo, sans-serif`
    for (const line of subLines) {
      ctx.fillText(line, pad, y)
      y += body * 1.4
    }
  }
  if (spec.cta) {
    y += body * 0.8
    ctx.font = `800 ${Math.round(body * 1.1)}px "Schibsted Grotesk", Archivo, sans-serif`
    const label = spec.cta.toUpperCase()
    const bw = ctx.measureText(label).width + body * 1.6
    ctx.fillStyle = INK
    ctx.fillRect(pad, y, bw, body * 2.2)
    ctx.fillStyle = '#FFFFFF'
    ctx.fillText(label, pad + body * 0.8, y + body * 0.55)
  }

  // the tear-off strip: a dashed rule, the QR, the address
  ctx.strokeStyle = INK
  ctx.lineWidth = Math.max(3, w * 0.003)
  ctx.setLineDash([w * 0.012, w * 0.008])
  ctx.beginPath()
  ctx.moveTo(0, tearTop)
  ctx.lineTo(w, tearTop)
  ctx.stroke()
  ctx.setLineDash([])
  const qrSize = Math.round(tearH - body * 2.4)
  const href = spec.href || (/^https?:\/\//.test(spec.url) ? spec.url : `https://${spec.url}`)
  drawQr(ctx, href, pad, tearTop + (tearH - qrSize) / 2, qrSize)
  const tx = pad + qrSize + body * 1.6
  const [host, ...rest] = spec.url.replace(/^https?:\/\//, '').split('/')
  // a path has no spaces to wrap at, so it is set as large as it fits on one line
  const path = '/' + rest.join('/')
  let pathSize = Math.round(body * 1.6)
  for (; pathSize > body * 0.8; pathSize -= 2) {
    ctx.font = `900 expanded ${pathSize}px Anybody, Archivo, sans-serif`
    if (ctx.measureText(path).width <= w - tx - pad) break
  }
  ctx.fillStyle = blueInk
  let ty = tearTop + (tearH - (pathSize * 1.2 + body * 3)) / 2
  ctx.fillText(path, tx, ty)
  ty += pathSize * 1.2
  ctx.fillStyle = INK_2
  ctx.font = `600 ${body}px "Schibsted Grotesk", Archivo, sans-serif`
  ctx.fillText(host ?? '', tx, ty + body * 0.3)
  ctx.fillText('Scan it, or type it in', tx, ty + body * 1.6)

  return canvas.toDataURL('image/png')
}

/** The wording per role. Kept here so every surface says the same thing. */
/** What a nominee can ask their followers for. The host's card never begs. */
export const NOMINEE_CTAS = [
  { id: 'vote', label: 'Vote for me', cta: 'Vote for me' },
  { id: 'help', label: 'One click helps', cta: 'One click, and I am in' },
  { id: 'quiet', label: 'No call to action', cta: '' },
] as const

export function cardCopy(
  role: ShareRole,
  award: Award,
  opts: { nomination?: string; nominee?: string; closes?: string; cta?: string } = {},
): { kicker: string; headline: string; sub?: string; cta?: string } {
  const host = award.host.name
  switch (role) {
    case 'host':
      return {
        kicker: `${host} presents`,
        headline: award.name,
        sub: opts.nomination
          ? `Vote in ${opts.nomination}${opts.closes ? ` · closes ${opts.closes}` : ''}`
          : `${award.nominations.length} categories, voted by viewers${opts.closes ? ` · closes ${opts.closes}` : ''}`,
      }
    case 'nominee':
      return {
        kicker: 'I am nominated',
        headline: opts.nominee ?? award.name,
        sub: opts.nomination
          ? `${opts.nomination} · ${award.name}${opts.closes ? ` · vote until ${opts.closes}` : ''}`
          : award.name,
        cta: opts.cta,
      }
    case 'voter':
      return {
        kicker: 'I voted',
        headline: opts.nomination ? `My pick in ${opts.nomination}` : `My ballot is in`,
        sub: `${award.name}${opts.closes ? ` · voting until ${opts.closes}` : ''}`,
        cta: 'Your turn',
      }
    case 'winner':
      return {
        kicker: 'Winner',
        headline: opts.nominee ?? award.name,
        sub: `${opts.nomination ?? award.name} · ${award.name}`,
      }
  }
}
