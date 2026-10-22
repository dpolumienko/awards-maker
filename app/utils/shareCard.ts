import { accentOf, resolveAccent, tint } from './accent'
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
export type ShareFormat = 'link' | 'square' | 'portrait' | 'tall' | 'wide' | 'story'

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
  /** The Envelope version's cream ticket instead of the stage card (renderEnvelopeCard). */
  envelope?: boolean
  /** The full address the flyer's QR code opens; `url` is the one printed. */
  href?: string
  /** The nominee's picture: a channel avatar (drawn round) or an image/clip still. */
  image?: string
  imageRound?: boolean
  /** a channel with no avatar: its initials in a round mark */
  initials?: string
}

export const FORMATS: Record<ShareFormat, { w: number; h: number; name: string; note: string }> = {
  link: { w: 1200, h: 630, name: 'Link card', note: 'X, Discord, any link preview' },
  // the social sizes Ed asked for (2026-10-22)
  square: { w: 1080, h: 1080, name: 'Square 1080×1080', note: 'Instagram, X, Telegram' },
  portrait: { w: 1080, h: 1350, name: 'Portrait 1080×1350', note: 'Instagram feed' },
  tall: { w: 1080, h: 1440, name: 'Tall 1080×1440', note: 'Instagram feed, Threads' },
  wide: { w: 1920, h: 1080, name: 'Wide 1920×1080', note: 'YouTube, a stream scene' },
  story: { w: 1080, h: 1920, name: 'Story 1080×1920', note: 'Instagram, TikTok, YouTube' },
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
  return renderEnvelopeCard(spec)
}

/**
 * The Envelope card (review 2026-10-16): the show on a cream ticket in a dark room,
 * the way its awards page opens - the theme drawn softly in the accent, brightest in
 * the bottom-right corner; the claim in brass, the line in Gloock, the address below
 * the ticket. A cover goes under the ticket with a cream wash, as on the page.
 */
async function renderEnvelopeCard(spec: CardSpec): Promise<string> {
  const { w, h } = FORMATS[spec.format]
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  const accent = resolveAccent(accentOf(spec.look))
  // a card taller than it is wide centres its words; a wide one sets them at the foot
  const story = h > w * 1.15
  // type is sized from the card's area, so a square and a 1920 read alike
  const unit = Math.sqrt(w * h)
  const display = spec.look.font ? `'${spec.look.font}'` : 'Gloock'
  try {
    await document.fonts.load(`400 100px ${display}`)
    await document.fonts.load('600 40px "Hanken Grotesk"')
  } catch {
    /* a face that will not load simply falls back */
  }
  await document.fonts.ready

  // the room
  ctx.fillStyle = '#0B0B0A'
  ctx.fillRect(0, 0, w, h)
  const glow = ctx.createRadialGradient(w * 0.5, 0, 0, w * 0.5, 0, h * 0.9)
  glow.addColorStop(0, 'rgba(255,232,190,0.10)')
  glow.addColorStop(1, 'rgba(255,232,190,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, w, h)

  // the ticket
  const pad = Math.round(w * 0.06)
  const bodySize = Math.round(unit * 0.03)
  const tx = pad, ty = pad, tw = w - pad * 2, th = h - pad * 2 - bodySize * 2.6
  const r = Math.round(w * 0.02)
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(tx, ty, tw, th, r)
  ctx.clip()
  ctx.fillStyle = '#F4EFE5'
  ctx.fillRect(tx, ty, tw, th)
  const img = spec.look.coverUrl ? await loadImage(spec.look.coverUrl) : null
  if (img) {
    ctx.save()
    ctx.translate(tx, ty)
    drawCover(ctx, img, tw, th)
    ctx.restore()
    const wash = ctx.createLinearGradient(tx, 0, tx + tw, 0)
    wash.addColorStop(0, 'rgba(244,239,229,0.94)')
    wash.addColorStop(1, 'rgba(244,239,229,0.45)')
    ctx.fillStyle = wash
    ctx.fillRect(tx, ty, tw, th)
  } else {
    const corner = ctx.createRadialGradient(tx + tw, ty + th, 0, tx + tw, ty + th, Math.max(tw, th) * 0.95)
    corner.addColorStop(0, tint(accent, 'CC'))
    corner.addColorStop(0.3, tint(accent, '55'))
    corner.addColorStop(1, tint(accent, '00'))
    ctx.fillStyle = corner
    ctx.fillRect(tx, ty, tw, th)
  }
  ctx.restore()

  const ix = tx + Math.round(tw * 0.07), iw = tw - Math.round(tw * 0.14)
  ctx.textBaseline = 'top'
  ctx.fillStyle = '#8E6E33'
  ctx.font = `600 ${Math.round(bodySize * 1.05)}px "Hanken Grotesk", sans-serif`
  ctx.letterSpacing = '3px'
  ctx.fillText(spec.kicker.toUpperCase(), ix, ty + Math.round(th * 0.1))
  ctx.letterSpacing = '0px'

  // the nominee's own picture, top right of the ticket: an avatar round, a still in a rounded square
  const pic = spec.image ? await loadImage(spec.image) : null
  if (!pic && spec.imageRound && spec.initials) {
    const ps = Math.round(Math.min(tw, th) * (story ? 0.26 : 0.3))
    const px = tx + tw - Math.round(tw * 0.07) - ps
    const py = ty + Math.round(th * 0.08)
    ctx.fillStyle = accent
    ctx.beginPath()
    ctx.arc(px + ps / 2, py + ps / 2, ps / 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#0B0B0A'
    ctx.font = `700 ${Math.round(ps * 0.34)}px "Hanken Grotesk", sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(spec.initials, px + ps / 2, py + ps / 2)
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
  }
  if (pic) {
    const ps = Math.round(Math.min(tw, th) * (story ? 0.26 : 0.3))
    const px = tx + tw - Math.round(tw * 0.07) - ps
    const py = ty + Math.round(th * 0.08)
    ctx.save()
    ctx.beginPath()
    if (spec.imageRound) ctx.arc(px + ps / 2, py + ps / 2, ps / 2, 0, Math.PI * 2)
    else ctx.roundRect(px, py, ps, ps, r)
    ctx.clip()
    if (spec.imageRound) {
      ctx.translate(px, py)
      drawCover(ctx, pic, ps, ps)
    } else {
      // stills fill the square; an emote (a small transparent picture) sits whole on a soft plate
      ctx.fillStyle = 'rgba(21,20,15,0.08)'
      ctx.fillRect(px, py, ps, ps)
      if (pic.width < 400) {
        const k = Math.min((ps * 0.78) / pic.width, (ps * 0.78) / pic.height)
        ctx.drawImage(pic, px + (ps - pic.width * k) / 2, py + (ps - pic.height * k) / 2, pic.width * k, pic.height * k)
      } else {
        ctx.translate(px, py)
        drawCover(ctx, pic, ps, ps)
      }
    }
    ctx.restore()
  }

  const top = ty + Math.round(th * 0.1) + bodySize * 2.4 + ((pic || (spec.imageRound && spec.initials)) && story ? Math.round(Math.min(tw, th) * 0.26) : 0)
  const bottom = ty + th - Math.round(th * 0.1)
  let size = Math.round(unit * (story ? 0.075 : 0.07))
  let lines: string[] = []
  let subLines: string[] = []
  let block = 0
  for (; size > bodySize * 1.3; size -= 4) {
    ctx.font = `400 ${size}px ${display}, Georgia, serif`
    lines = wrap(ctx, spec.headline, iw)
    ctx.font = `500 ${bodySize}px "Hanken Grotesk", sans-serif`
    subLines = spec.sub ? spec.sub.split('\n').flatMap((l) => wrap(ctx, l, iw)).slice(0, 4) : []
    block = lines.length * Math.round(size * 1.02) + (subLines.length ? subLines.length * Math.round(bodySize * 1.4) + bodySize * 0.7 : 0) + (spec.cta ? Math.round(bodySize * 2.4) : 0)
    if (lines.length <= 4 && block <= bottom - top) break
  }
  let y = story ? top + (bottom - top - block) / 2 : bottom - block
  ctx.fillStyle = '#15140F'
  ctx.font = `400 ${size}px ${display}, Georgia, serif`
  for (const line of lines) {
    ctx.fillText(line, ix, y)
    y += Math.round(size * 1.02)
  }
  if (subLines.length) {
    ctx.fillStyle = '#4A463D'
    ctx.font = `500 ${bodySize}px "Hanken Grotesk", sans-serif`
    y += Math.round(bodySize * 0.7)
    const yStart = y
    const lead = spec.sub?.split('\n')[0] ?? ''
    for (const line of subLines) {
      const isLead = lead.startsWith(line) && y === yStart
      ctx.fillStyle = isLead ? '#15140F' : '#4A463D'
      ctx.font = `${isLead ? 600 : 500} ${bodySize}px "Hanken Grotesk", sans-serif`
      ctx.fillText(line, ix, y)
      y += Math.round(bodySize * 1.4)
    }
  }
  if (spec.cta) {
    y += Math.round(bodySize * 0.6)
    ctx.font = `600 ${Math.round(bodySize * 1.1)}px "Hanken Grotesk", sans-serif`
    const label = spec.cta
    const bw = ctx.measureText(label).width + bodySize * 1.6, bh = bodySize * 2
    ctx.fillStyle = '#15140F'
    ctx.beginPath()
    ctx.roundRect(ix, y, bw, bh, r * 0.6)
    ctx.fill()
    ctx.fillStyle = '#F3EEE4'
    ctx.fillText(label, ix + bodySize * 0.8, y + (bh - bodySize * 1.1) / 2)
  }

  // the address, under the ticket: a brass dot and the link
  const footY = h - pad - bodySize * 1.1
  ctx.fillStyle = '#C9A45C'
  ctx.beginPath()
  ctx.arc(pad + bodySize * 0.28, footY + bodySize * 0.55, bodySize * 0.28, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#F3F0E8'
  ctx.font = `600 ${bodySize}px "Hanken Grotesk", sans-serif`
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
        sub: [
          opts.nomination ? `Vote in ${opts.nomination}` : `${award.nominations.length} categories, voted by viewers`,
          opts.closes && `Closes ${opts.closes}`,
        ].filter(Boolean).join('\n'),
      }
    case 'nominee':
      return {
        kicker: 'I am nominated',
        headline: opts.nominee ?? award.name,
        sub: [opts.nomination, award.name, opts.closes && `Vote until ${opts.closes}`].filter(Boolean).join('\n'),
        cta: opts.cta,
      }
    case 'voter':
      return {
        kicker: 'I voted',
        headline: opts.nomination ? `My pick in ${opts.nomination}` : `My ballot is in`,
        sub: [award.name, opts.closes && `Voting until ${opts.closes}`].filter(Boolean).join('\n'),
        cta: 'Your turn',
      }
    case 'winner':
      return {
        kicker: 'Winner',
        headline: opts.nominee ?? award.name,
        sub: [opts.nomination, award.name].filter(Boolean).join('\n'),
      }
  }
}
