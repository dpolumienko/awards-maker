// "Create demo award" on the static demo: a show with every feature filled in,
// so the whole flow can be tried without typing (review 2026-09-25). Dates put
// voting open right now; pictures are drawn here on a canvas, so the demo needs
// no image files. Goes with the rest of app/demo/.
import type { Award, Nominee } from '~/types/award'
import { envAsset } from '~/utils/envelopeAssets'

// Kick clips copied from streamscharts.com/clips: Kick's CDN serves their frame
// and playlist publicly, so the demo shows real previews (a Twitch frame needs the
// API, which only the server has)
const CLIP_FINAL = 'https://streamscharts.com/clips?platform=kick&clip=b9__clip_01M3Z02R2YCX3HS0HAF54HTRPQ'
const CLIP_IRL = 'https://streamscharts.com/clips?platform=kick&clip=40__clip_01M40A8JRW950YDRJRJREJ2ZE5'

let n = 0
const id = () => `demo-${Date.now().toString(36)}-${++n}`

/** A JPEG data URL: a gradient, a label, and a little grain so it reads as a photo. */
function picture(w: number, h: number, from: string, to: string, label: string, sub = ''): string {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  const g = ctx.createLinearGradient(0, 0, w, h)
  g.addColorStop(0, from)
  g.addColorStop(1, to)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  for (let i = 0; i < 18; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.04 + Math.random() * 0.06})`
    ctx.beginPath()
    ctx.arc(Math.random() * w, Math.random() * h, 20 + Math.random() * h * 0.3, 0, Math.PI * 2)
    ctx.fill()
  }
  if (!label) return c.toDataURL('image/jpeg', 0.85)
  ctx.fillStyle = '#fff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `800 ${Math.round(h * 0.16)}px Archivo, Arial, sans-serif`
  ctx.fillText(label, w / 2, sub ? h * 0.44 : h / 2)
  if (sub) {
    ctx.font = `600 ${Math.round(h * 0.07)}px Archivo, Arial, sans-serif`
    ctx.fillStyle = 'rgba(255,255,255,.8)'
    ctx.fillText(sub, w / 2, h * 0.62)
  }
  return c.toDataURL('image/jpeg', 0.85)
}

const channel = (name: string, platform: 'twitch' | 'kick' | 'youtube', followers: number, avatar?: string): Nominee => ({
  id: id(),
  kind: 'channel',
  channel: { id: id(), name, platform, followers, avatar },
})
const text = (t: string): Nominee => ({ id: id(), kind: 'text', text: t })
const image = (t: string, src: string): Nominee => ({ id: id(), kind: 'media', text: t, image: src })
const clip = (t: string, url: string): Nominee => ({ id: id(), kind: 'media', text: t, url })

export function demoAward(host: string): Award {
  const hour = 3600_000
  const at = (ms: number) => new Date(Date.now() + ms).toISOString().replace(/:\d{2}\.\d{3}Z$/, ':00Z')
  return {
    slug: '',
    name: `Demo Awards ${new Date().getFullYear()}`,
    description:
      'A test show with every feature switched on: channels from all three platforms, text, image and clip nominees, partners and a custom look.',
    templateId: undefined,
    // open an hour ago, so the ballot works right away
    opensAt: at(-hour),
    closesAt: at(7 * 24 * hour),
    ceremonyAt: at(8 * 24 * hour),
    timezone: 'Europe/Kyiv',
    // only what the Look settings can make (Ed, 2026-10-22): a theme, an accent from the
    // palette and a listed face - the generated cover it had could not be made in the builder
    look: {
      theme: 'glow',
      accent: '#9B7BFF',
      font: 'Gloock',
    },
    host: { name: host, platform: 'twitch' },
    partners: [
      { id: id(), name: 'Streams Charts', url: 'https://streamscharts.com' },
      { id: id(), name: 'Demo Sponsor', url: 'example.com' },
    ],
    // six categories: one over the free ceiling, so the paid tier is exercised too
    nominations: [
      {
        id: id(),
        title: 'Streamer of the Year',
        // real streamers with their avatars (Ed, 2026-10-22): a demo of nameless initials showed nothing
        nominees: [channel('IShowSpeed', 'youtube', 40_000_000, '/img/avatars/youtube-ishowspeed.webp'), channel('kaicenat', 'twitch', 14_000_000, '/img/avatars/twitch-kaicenat.webp'), channel('xQc', 'kick', 1_400_000, '/img/avatars/kick-xqc.webp'), channel('pokimane', 'twitch', 9_300_000, '/img/avatars/twitch-pokimane.webp')],
      },
      {
        id: id(),
        title: 'Clip of the Year',
        nominees: [
          clip('The finals goal', CLIP_FINAL),
          clip('The street interview', CLIP_IRL),
          image('The 3am raid', picture(1200, 800, '#0f2027', '#2c5364', 'THE 3AM RAID')),
        ],
      },
      {
        id: id(),
        title: 'Best Emote',
        nominees: [
          // Twitch's own global emotes, the real pictures (review 2026-10-16, item 7)
          image('PogChamp', envAsset('8bf40cad.webp')),
          image('LUL', envAsset('bb62b448.webp')),
          image('Kreygasm', envAsset('260a4ad5.webp')),
          image('SeemsGood', envAsset('963e4b03.webp')),
        ],
      },
      {
        id: id(),
        title: 'Chatter of the Year',
        nominees: [text('mod_mikhail'), text('lurker_2006'), text('pasta_queen')],
      },
      {
        id: id(),
        title: 'Rising Star',
        nominees: [channel('jynxzi', 'twitch', 7_800_000, '/img/avatars/twitch-jynxzi.webp'), channel('caseoh_', 'twitch', 5_100_000, '/img/avatars/twitch-caseoh_.webp'), channel('Adin Ross', 'kick', 1_900_000, '/img/avatars/kick-adinross.webp'), channel('ohnePixel', 'twitch', 1_900_000, '/img/avatars/twitch-ohnepixel.webp')],
      },
      {
        id: id(),
        title: 'Moment of the Year',
        nominees: [text('The 12-hour charity stream'), clip('The finals goal', CLIP_FINAL), text('Subathon finale')],
      },
    ],
    tier: 'paid',
    status: 'draft',
  } as Award
}
