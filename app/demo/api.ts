// The static demo's backend, in the browser.
//
// GitHub Pages serves files and nothing else, so on the demo build every
// /api/* call lands here instead (plugins/00.demo-api.client.ts) and is
// answered from localStorage, in the same shapes the real handlers in
// server/api/ return. It exists so the whole flow - sign in, build, publish,
// vote, close, announce, run the ceremony - can be clicked through without a
// server (review 2026-09-25). It is never loaded outside the demo build, and it
// goes when the demo does.
//
// Shows prerendered into the demo from the real database are read-only here:
// their data is in the page, not in this store, so voting on them answers 404.
import { slugify } from '#shared/slug'
import { ranksOnly } from '#shared/tally'
import { CHANNELS, isListedChannel, searchChannels } from '~/data/channels.mock'
import { PUBLISH } from '#shared/limits'
import type { Award } from '~/types/award'

const KEY = 'am-demo-db'

interface DemoUser {
  id: number
  login: string
  name: string
  avatar: null
  role: 'admin'
  host: true
  platform: 'twitch' | 'kick'
}
interface Ballot {
  userId: number
  picks: Record<string, string>
  at: string
}
interface Show {
  award: Award
  ownerId: number
  ballots: Ballot[]
  ceremony: { stage: string; font: string; reveal: string; image?: string; partners?: boolean; counts?: boolean } | null
}
interface Db {
  user: DemoUser | null
  draft: Partial<Award> | null
  shows: Record<string, Show>
  seq: number
}

// admin, so a paid-looking show publishes without a checkout that cannot run here
export const DEMO_USER: DemoUser = { id: 9001, login: 'demo_host', name: 'demo_host', avatar: null, role: 'admin', host: true, platform: 'twitch' }

function load(): Db {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return realChannelsOnly(JSON.parse(raw) as Db)
  } catch {
    // private mode or blocked storage: a fresh store every load
  }
  return { user: null, draft: null, shows: {}, seq: 1000 }
}
/**
 * Shows and drafts saved before the demo held only real channels still carry the
 * invented ones (vika_plays, dzvin_tv…). Each is swapped for a real streamer not
 * yet in that category; the nominee keeps its id, so ballots already cast still
 * count (Ed, 2026-10-22: no invented channels anywhere).
 */
function realChannelsOnly(db: Db): Db {
  let changed = false
  const fix = (noms?: { nominees: Award['nominations'][number]['nominees'] }[]) =>
    noms?.forEach((n) =>
      n.nominees.forEach((x) => {
        if (x.kind !== 'channel' || isListedChannel(x.channel)) return
        const taken = new Set(n.nominees.map((y) => (y.kind === 'channel' ? y.channel.name.toLowerCase() : '')))
        const real = CHANNELS.find((c) => !taken.has(c.name.toLowerCase()))
        if (!real) return
        x.channel = { ...real }
        changed = true
      }),
    )
  fix(db.draft?.nominations)
  Object.values(db.shows ?? {}).forEach((show) => fix(show.award.nominations))
  // the old demo show drew its backdrop from a generated cover the builder cannot make
  // (Ed, 2026-10-22: "do not mislead") - it gets the look the Look settings can make
  const OLD = 'text, image and clip nominees, a cover, partners and a custom look.'
  const relook = (a?: Partial<Award> | null) => {
    if (!a?.description?.includes(OLD)) return
    a.description = a.description.replace(OLD, 'text, image and clip nominees, partners and a custom look.')
    a.look = { theme: 'glow', accent: '#9B7BFF', font: 'Gloock' }
    changed = true
  }
  relook(db.draft)
  Object.values(db.shows ?? {}).forEach((show) => relook(show.award))
  if (changed) save(db)
  return db
}

function save(db: Db) {
  try {
    localStorage.setItem(KEY, JSON.stringify(db))
  } catch {
    // nothing to do - the demo keeps working for this page view
  }
}

/** Signs in the demo host, as whichever provider was clicked. */
export function demoSignIn(platform: DemoUser['platform'] = 'twitch') {
  const db = load()
  db.user = { ...DEMO_USER, platform }
  save(db)
}

function fail(statusCode: number, statusMessage: string): never {
  throw Object.assign(new Error(statusMessage), {
    statusCode,
    status: statusCode,
    statusMessage,
    data: { statusCode, statusMessage, message: statusMessage },
  })
}

const now = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')

/** Draft in, stored award out: every category and nominee gets an id. */
function withIds(db: Db, a: Partial<Award>): Award {
  const next = () => String(++db.seq)
  return {
    ...(a as Award),
    partners: (a.partners ?? []).map((p) => ({ ...p, id: p.id || next() })),
    nominations: (a.nominations ?? []).map((n) => ({
      ...n,
      id: n.id || next(),
      nominees: n.nominees.map((x) => ({ ...x, id: (x as { id?: string }).id || next() })) as Award['nominations'][number]['nominees'],
    })),
  }
}

function summary(s: Show) {
  const a = s.award
  return {
    slug: a.slug,
    name: a.name,
    description: a.description,
    opensAt: a.opensAt,
    closesAt: a.closesAt,
    ceremonyAt: a.ceremonyAt,
    timezone: a.timezone,
    look: a.look,
    host: a.host,
    tier: a.tier,
    status: a.status,
    closedAt: a.closedAt,
    resultsAt: a.resultsAt,
    offline: a.offline,
    publishedAt: a.publishedAt,
    voters: s.ballots.length,
    categories: a.nominations.length,
  }
}

function tally(s: Show) {
  const counts: Record<string, Record<string, number>> = {}
  const days: Record<string, number> = {}
  for (const b of s.ballots) {
    for (const [nomination, nominee] of Object.entries(b.picks)) {
      counts[nomination] = counts[nomination] ?? {}
      counts[nomination]![nominee] = (counts[nomination]![nominee] ?? 0) + 1
    }
    const day = b.at.slice(0, 10)
    days[day] = (days[day] ?? 0) + 1
  }
  return { voters: s.ballots.length, counts, days }
}

function paidFeatures(a: Partial<Award>) {
  const look = (a.look ?? {}) as Record<string, unknown>
  return (
    (a.nominations?.length ?? 0) > 5 ||
    ['theme', 'accent', 'font', 'coverUrl', 'logoUrl', 'hideLogo'].some((k) => look[k]) ||
    (a.nominations ?? []).some((n) => n.nominees.some((x) => x.kind === 'media'))
  )
}

export async function demoApi(url: string, opts: { method?: string; body?: unknown; query?: Record<string, unknown> } = {}): Promise<unknown> {
  const method = (opts.method ?? 'GET').toUpperCase()
  const u = new URL(url, 'http://demo.local')
  const path = u.pathname.replace(/\/+$/, '')
  const query = { ...Object.fromEntries(u.searchParams), ...(opts.query ?? {}) }
  const body = (typeof opts.body === 'string' ? JSON.parse(opts.body) : opts.body) as Record<string, unknown> | undefined
  const db = load()
  const user = db.user
  const needUser = () => user ?? fail(401, 'Sign in first')

  // session (nuxt-auth-utils)
  if (path === '/api/_auth/session') {
    if (method === 'DELETE') {
      db.user = null
      save(db)
      return {}
    }
    return user ? { user, loggedInAt: Date.now() } : {}
  }

  if (path === '/api/catalog-status') return { open: false, count: 0 }
  if (path === '/api/channels/search') return { channels: searchChannels(String(query.q ?? '')), source: 'sample' }
  if (path === '/api/reports') return { ok: true }
  if (path === '/api/billing/orders') return { orders: [], payments: false, comped: true }
  if (path === '/api/billing/checkout') fail(503, 'Payments are off in the demo')
  if (path === '/api/uploads') fail(404, 'No uploads in the demo')

  if (path === '/api/draft') {
    needUser()
    if (method === 'PUT') {
      db.draft = { ...(body as Partial<Award>), status: 'draft' }
      save(db)
      return { ok: true }
    }
    const draft = db.draft ?? { name: '', description: '', nominations: [], partners: [], look: {}, host: { name: DEMO_USER.name, platform: db.user?.platform ?? 'twitch' } }
    return { draft: withIds(db, { slug: '', status: 'draft', ...draft }) }
  }

  if (path === '/api/draft/publish') {
    needUser()
    const input = body as Partial<Award>
    if (!input.name?.trim()) fail(400, 'Give the show a name')
    const nominations = (input.nominations ?? []).filter((n) => n.title.trim() && n.nominees.length >= PUBLISH.minNomineesPerNomination)
    if (nominations.length < PUBLISH.minNominations) fail(400, `A show needs at least ${PUBLISH.minNominations} category with ${PUBLISH.minNomineesPerNomination} nominees`)
    // only channels that exist (server/api/draft/publish.post.ts does the same against the API)
    const missing = nominations.flatMap((n) => n.nominees).filter((x) => x.kind === 'channel' && !isListedChannel(x.channel))
    if (missing.length) fail(400, `We could not find these channels: ${[...new Set(missing.map((x) => (x.kind === 'channel' ? x.channel.name : '')))].join(', ')}`)
    const base = slugify(input.name) || 'awards'
    let slug = base
    for (let n = 2; db.shows[slug]; n++) slug = `${base.slice(0, 60 - String(n).length - 1)}-${n}`
    const tier = paidFeatures(input) ? 'paid' : 'free'
    const award = withIds(db, { ...input, nominations, slug, status: 'published', tier, publishedAt: now() })
    // no seeded ballots (Ed, 2026-10-22): every number on the page and the dashboard
    // is counted from votes actually cast, starting at zero
    db.shows[slug] = { award, ownerId: DEMO_USER.id, ballots: [], ceremony: null }
    db.draft = null
    save(db)
    return { award, tier }
  }

  if (path === '/api/mine') {
    needUser()
    return { awards: Object.values(db.shows).map(summary).reverse() }
  }
  if (path === '/api/awards') return { awards: Object.values(db.shows).filter((s) => !s.award.offline).map(summary).reverse() }

  const m = /^\/api\/awards\/([^/]+)(?:\/([a-z]+))?$/.exec(path)
  if (m) {
    const slug = decodeURIComponent(m[1]!)
    const action = m[2]
    const show = db.shows[slug] ?? fail(404, 'This demo show lives on the real site - vote on a show you publish here')
    const isHost = !!user
    const mine = user ? show.ballots.find((b) => b.userId === user.id) : undefined

    if (!action && method === 'DELETE') {
      needUser()
      delete db.shows[slug]
      save(db)
      return { ok: true }
    }
    if (!action) {
      // offline: only the host sees it, as on the real site
      if (show.award.offline && !isHost) fail(404, 'No such awards')
      const t = tally(show)
      return {
        award: show.award,
        isHost,
        ballot: mine ? { at: mine.at, picks: mine.picks } : null,
        tally: isHost || show.award.resultsAt ? (show.award.hideCounts && !isHost ? ranksOnly(t) : t) : null,
        voters: t.voters,
      }
    }
    if (action === 'ballot') {
      const u2 = needUser()
      const a = show.award
      if (a.offline) fail(404, 'No such awards')
      if (a.closedAt || (a.closesAt && Date.parse(a.closesAt) < Date.now())) fail(409, 'Voting is closed')
      if (a.opensAt && Date.parse(a.opensAt) > Date.now()) fail(409, 'Voting has not opened yet')
      const picks = ((body ?? {}).picks ?? {}) as Record<string, string>
      if (!Object.keys(picks).length) fail(400, 'Pick at least one')
      const onBallot = (nom: string, who: string) => a.nominations.some((n) => n.id === nom && n.nominees.some((x) => x.id === who))
      if (!Object.entries(picks).every(([nom, who]) => onBallot(nom, who))) fail(400, 'That nominee is not on this ballot')
      // as the server: a second submit only fills the categories skipped the first time
      const fresh = Object.entries(picks).filter(([nom]) => !mine?.picks[nom])
      if (!fresh.length) fail(409, 'You have already voted in these categories')
      if (mine) Object.assign(mine.picks, Object.fromEntries(fresh))
      else show.ballots.push({ userId: u2.id, picks, at: now() })
      save(db)
      return { picks: fresh.length }
    }
    if (action === 'tally') return { tally: tally(show), isHost }
    if (action === 'counts') {
      needUser()
      show.award.hideCounts = !!(body ?? {}).hidden
      save(db)
      return { ok: true, hidden: show.award.hideCounts }
    }
    if (action === 'offline') {
      needUser()
      show.award.offline = !!(body ?? {}).offline
      save(db)
      return { ok: true, offline: show.award.offline }
    }
    if (action === 'close') {
      needUser()
      show.award.closedAt = show.award.closedAt || now()
      save(db)
      return { ok: true }
    }
    if (action === 'results') {
      needUser()
      show.award.resultsAt = now()
      show.award.closedAt = show.award.closedAt || now()
      save(db)
      return { ok: true }
    }
    if (action === 'ceremony') {
      if (method === 'PUT') {
        needUser()
        show.ceremony = body as Show['ceremony']
        save(db)
        return { ok: true }
      }
      return { ceremony: show.ceremony }
    }
  }

  fail(404, `Not in the demo: ${method} ${path}`)
}
