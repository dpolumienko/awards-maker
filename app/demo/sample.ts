// "Create demo award" on the static demo: a show with every feature filled in,
// so the whole flow can be tried without typing (review 2026-09-25). Dates put
// voting open right now; pictures are drawn here on a canvas, so the demo needs
// no image files. Goes with the rest of app/demo/.
import type { Award, Nominee } from '~/types/award'

const CLIP = 'https://www.twitch.tv/dota2_maincast/clip/AverageArtsyGiraffeKeepo-Wce_IdAqsusGR4Ip'

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

const channel = (name: string, platform: 'twitch' | 'kick' | 'youtube', followers: number): Nominee => ({
  id: id(),
  kind: 'channel',
  channel: { id: id(), name, platform, followers },
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
      'A test show with every feature switched on: channels from all three platforms, text, image and clip nominees, a cover, partners and a custom look.',
    templateId: undefined,
    // open an hour ago, so the ballot works right away
    opensAt: at(-hour),
    closesAt: at(7 * 24 * hour),
    ceremonyAt: at(8 * 24 * hour),
    timezone: 'Europe/Kyiv',
    look: {
      theme: 'glow',
      accent: '#9B6DFF',
      font: 'Anton',
      // no lettering: the cover runs up under the site header
      coverUrl: picture(1800, 770, '#2b1055', '#d53369', ''),
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
        nominees: [channel('ishowspeed', 'youtube', 41_200_000), channel('vika_plays', 'twitch', 188_000), channel('dzvin_tv', 'kick', 88_100)],
      },
      {
        id: id(),
        title: 'Clip of the Year',
        nominees: [
          clip('The Maincast moment', CLIP),
          clip('Same clip, second slot', CLIP),
          image('The 3am raid', picture(1200, 800, '#0f2027', '#2c5364', 'THE 3AM RAID')),
        ],
      },
      {
        id: id(),
        title: 'Best Emote',
        nominees: [
          image('PogFrog', picture(800, 800, '#11998e', '#38ef7d', 'PogFrog')),
          image('SadCat', picture(800, 800, '#4568dc', '#b06ab3', 'SadCat')),
          image('BigLaugh', picture(800, 800, '#f7971e', '#ffd200', 'BigLaugh')),
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
        nominees: [channel('n1ghtowl', 'twitch', 41_900), channel('ka1ra', 'kick', 15_800), channel('nazar_speed', 'youtube', 76_500)],
      },
      {
        id: id(),
        title: 'Moment of the Year',
        nominees: [text('The 12-hour charity stream'), clip('The Maincast clip', CLIP), text('Subathon finale')],
      },
    ],
    tier: 'paid',
    status: 'draft',
  } as Award
}
