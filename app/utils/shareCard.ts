import { accentOf, resolveAccent } from './accent'
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
