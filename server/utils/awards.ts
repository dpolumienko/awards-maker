import type { PoolConnection } from 'mysql2/promise'
import { query, queryOne, transaction } from './db'
import { DEFAULT_TIME_ZONE, canonicalZone, fromDbDateTime, isTimeZone, toDbDateTime, toInstant } from '#shared/time'

// Everything that reads or writes a show. Handlers stay thin and call in here;
// no SQL lives in a route file.
//
// The rows are mapped back into the exact shape app/types/award.ts already
// describes, ids included - as strings, because that is what the builder has
// always passed around - so the pages did not have to learn a second vocabulary
// when the data stopped living in localStorage.

export interface NomineeRow {
  id: number
  nomination_id: number
  kind: 'channel' | 'text' | 'media'
  position: number
  channel_name: string | null
  channel_platform: 'twitch' | 'kick' | 'youtube' | null
  channel_followers: number | null
  text: string | null
  media_url: string | null
  image_path: string | null
}

export interface AwardRow {
  id: number
  owner_id: number
  slug: string | null
  status: 'draft' | 'published'
  tier: 'free' | 'paid'
  name: string
  description: string
  template_id: string | null
  opens_at: string | null
  closes_at: string | null
  ceremony_at: string | null
  /** IANA zone the show runs in; the dates above are UTC. */
  timezone: string
  look: string | Record<string, unknown> | null
  host_name: string
  host_platform: 'twitch' | 'kick' | 'youtube'
  closed_at: string | null
  results_at: string | null
  published_at: string | null
}

const AWARD_COLUMNS = `id, owner_id, slug, status, tier, name, description, template_id,
  opens_at, closes_at, ceremony_at, timezone, look, host_name, host_platform,
  closed_at, results_at, published_at`

/** mysql2 hands JSON back parsed on some server versions and as text on others. */
function readLook(value: AwardRow['look']): Record<string, unknown> {
  if (!value) return {}
  if (typeof value === 'object') return value as Record<string, unknown>
  try {
    return JSON.parse(value)
  } catch {
    return {}
  }
}

function toNominee(row: NomineeRow) {
  if (row.kind === 'channel') {
    return {
      id: String(row.id),
      kind: 'channel' as const,
      channel: {
        id: String(row.id),
        name: row.channel_name ?? '',
        platform: row.channel_platform ?? 'twitch',
        followers: row.channel_followers ?? 0,
      },
    }
  }
  if (row.kind === 'media') {
    return {
      id: String(row.id),
      kind: 'media' as const,
      text: row.text ?? '',
      url: row.media_url ?? undefined,
      image: row.image_path ?? undefined,
    }
  }
  return { id: String(row.id), kind: 'text' as const, text: row.text ?? '' }
}

/** One award with its categories, nominees and partners, in the client's shape. */
export async function hydrate(row: AwardRow) {
  const [nominations, nominees, partners] = await Promise.all([
    query<{ id: number; title: string }>(
      `SELECT id, title FROM nominations WHERE award_id = ? ORDER BY position, id`,
      [row.id],
    ),
    query<NomineeRow>(
      `SELECT n.* FROM nominees n
         JOIN nominations m ON m.id = n.nomination_id
        WHERE m.award_id = ?
        ORDER BY n.position, n.id`,
      [row.id],
    ),
    query<{ id: number; name: string; url: string }>(
      `SELECT id, name, url FROM partners WHERE award_id = ? ORDER BY position, id`,
      [row.id],
    ),
  ])

  const byNomination = new Map<number, NomineeRow[]>()
  for (const n of nominees) {
    const list = byNomination.get(n.nomination_id) ?? []
    list.push(n)
    byNomination.set(n.nomination_id, list)
  }

  return {
    slug: row.slug ?? '',
    name: row.name,
    description: row.description,
    templateId: row.template_id ?? undefined,
    opensAt: fromDbDateTime(row.opens_at),
    closesAt: fromDbDateTime(row.closes_at),
    ceremonyAt: fromDbDateTime(row.ceremony_at),
    timezone: row.timezone || DEFAULT_TIME_ZONE,
    look: readLook(row.look),
    host: { name: row.host_name, platform: row.host_platform },
    tier: row.tier,
    status: row.status,
    closedAt: row.closed_at ?? undefined,
    resultsAt: row.results_at ?? undefined,
    publishedAt: row.published_at ?? undefined,
    partners: partners.map((p) => ({ id: String(p.id), name: p.name, url: p.url })),
    nominations: nominations.map((m) => ({
      id: String(m.id),
      title: m.title,
      nominees: (byNomination.get(m.id) ?? []).map(toNominee),
    })),
  }
}

export function awardBySlug(slug: string, status: 'published' | 'any' = 'published') {
  return queryOne<AwardRow>(
    `SELECT ${AWARD_COLUMNS} FROM awards
      WHERE slug = ?${status === 'published' ? ` AND status = 'published'` : ''}
      LIMIT 1`,
    [slug],
  )
}

export function awardById(id: number) {
  return queryOne<AwardRow>(`SELECT ${AWARD_COLUMNS} FROM awards WHERE id = ? LIMIT 1`, [id])
}

/**
 * The catalog and the host's list both want "shows plus how many people voted",
 * and a per-row count query would be one round trip per card.
 */
export async function awardSummaries(where: string, params: (string | number)[] = []) {
  const rows = await query<AwardRow & { voters: number; categories: number }>(
    `SELECT ${AWARD_COLUMNS.split(',').map((c) => `a.${c.trim()}`).join(', ')},
            (SELECT COUNT(*) FROM ballots b WHERE b.award_id = a.id) AS voters,
            (SELECT COUNT(*) FROM nominations m WHERE m.award_id = a.id) AS categories
       FROM awards a
      WHERE ${where}
      ORDER BY a.published_at DESC, a.id DESC`,
    params,
  )
  return rows.map((r) => ({
    slug: r.slug ?? '',
    name: r.name,
    description: r.description,
    opensAt: fromDbDateTime(r.opens_at),
    closesAt: fromDbDateTime(r.closes_at),
    ceremonyAt: fromDbDateTime(r.ceremony_at),
    timezone: r.timezone || DEFAULT_TIME_ZONE,
    look: readLook(r.look),
    host: { name: r.host_name, platform: r.host_platform },
    tier: r.tier,
    status: r.status,
    closedAt: r.closed_at ?? undefined,
    resultsAt: r.results_at ?? undefined,
    publishedAt: r.published_at ?? undefined,
    voters: Number(r.voters),
    categories: Number(r.categories),
  }))
}

// ---------------------------------------------------------------- writing

export interface AwardInput {
  name: string
  description: string
  templateId?: string | null
  opensAt?: string | null
  closesAt?: string | null
  ceremonyAt?: string | null
  timezone?: string
  look: Record<string, unknown>
  host: { name: string; platform: 'twitch' | 'kick' | 'youtube' }
  partners: { name: string; url: string }[]
  nominations: {
    title: string
    nominees: {
      kind: 'channel' | 'text' | 'media'
      text?: string
      url?: string
      image?: string
      channel?: { name: string; platform: 'twitch' | 'kick' | 'youtube'; followers?: number }
    }[]
  }[]
}

/**
 * Categories, nominees and partners are replaced wholesale rather than diffed.
 *
 * A diff would have to answer "is this the same nominee renamed, or a different
 * one?", and getting that wrong silently moves votes between people. Replacing
 * is only safe while nothing points at the old rows - so publishing locks the
 * structure and `saveDraft` refuses once a ballot exists.
 */
async function writeChildren(conn: PoolConnection, awardId: number, input: AwardInput) {
  await conn.query(`DELETE FROM nominations WHERE award_id = ?`, [awardId])
  await conn.query(`DELETE FROM partners WHERE award_id = ?`, [awardId])

  for (const [i, p] of input.partners.entries()) {
    if (!p.name.trim() && !p.url.trim()) continue
    await conn.query(`INSERT INTO partners (award_id, name, url, position) VALUES (?, ?, ?, ?)`, [
      awardId,
      p.name.trim(),
      p.url.trim(),
      i,
    ])
  }

  for (const [i, m] of input.nominations.entries()) {
    const [res] = (await conn.query(
      `INSERT INTO nominations (award_id, title, position) VALUES (?, ?, ?)`,
      [awardId, m.title.trim(), i],
    )) as [{ insertId: number }, unknown]

    for (const [j, n] of m.nominees.entries()) {
      await conn.query(
        `INSERT INTO nominees
           (nomination_id, kind, position, channel_name, channel_platform, channel_followers,
            text, media_url, image_path)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          res.insertId,
          n.kind,
          j,
          n.channel?.name ?? null,
          n.channel?.platform ?? null,
          n.channel?.followers ?? null,
          n.text?.trim() || null,
          n.url?.trim() || null,
          n.image || null,
        ],
      )
    }
  }
}

/** The one open draft a host is allowed, created empty on first ask. */
export async function draftFor(userId: number, host: { name: string; platform: string }) {
  const existing = await queryOne<AwardRow>(
    `SELECT ${AWARD_COLUMNS} FROM awards WHERE owner_id = ? AND status = 'draft' ORDER BY id LIMIT 1`,
    [userId],
  )
  if (existing) return existing

  await query(
    `INSERT INTO awards (owner_id, status, host_name, host_platform) VALUES (?, 'draft', ?, ?)`,
    [userId, host.name, host.platform as string],
  )
  return (await queryOne<AwardRow>(
    `SELECT ${AWARD_COLUMNS} FROM awards WHERE owner_id = ? AND status = 'draft' ORDER BY id DESC LIMIT 1`,
    [userId],
  ))!
}

export async function saveAward(awardId: number, input: AwardInput) {
  // stored dates are UTC; the zone is what they are shown in, and what a bare
  // YYYY-MM-DD from an older builder is read in
  const zone = isTimeZone(input.timezone) ? canonicalZone(input.timezone) : DEFAULT_TIME_ZONE
  await transaction(async (conn) => {
    await conn.query(
      `UPDATE awards SET name = ?, description = ?, template_id = ?, opens_at = ?, closes_at = ?,
              ceremony_at = ?, timezone = ?, look = ?, host_name = ?, host_platform = ?
        WHERE id = ?`,
      [
        input.name.trim(),
        input.description.trim(),
        input.templateId ?? null,
        toDbDateTime(toInstant(input.opensAt, zone, 'start')),
        toDbDateTime(toInstant(input.closesAt, zone, 'end')),
        toDbDateTime(toInstant(input.ceremonyAt, zone, 'start')),
        zone,
        JSON.stringify(input.look ?? {}),
        input.host.name,
        input.host.platform,
        awardId,
      ],
    )
    await writeChildren(conn, awardId, input)
  })
}

// lives in shared/ so a test, or the builder one day, reads the same rules
export { slugify } from '#shared/slug'

/** Appends -2, -3 … until the slug is free. */
export async function freeSlug(base: string, ignoreId?: number): Promise<string> {
  const root = base || 'awards'
  for (let n = 1; n < 200; n++) {
    const candidate = n === 1 ? root : `${root}-${n}`
    const taken = await queryOne<{ id: number }>(
      `SELECT id FROM awards WHERE slug = ? AND id <> ? LIMIT 1`,
      [candidate, ignoreId ?? 0],
    )
    if (!taken) return candidate
  }
  return `${root}-${Date.now()}`
}

export async function publishAward(awardId: number, slug: string, tier: 'free' | 'paid') {
  await query(
    `UPDATE awards SET status = 'published', slug = ?, tier = ?, published_at = NOW() WHERE id = ?`,
    [slug, tier, awardId],
  )
}

export async function deleteAward(awardId: number) {
  // every child table cascades, including the ballots
  await query(`DELETE FROM awards WHERE id = ?`, [awardId])
}

/** 404 if there is no such show, 403 if it is not this person's. */
export async function ownedAward(slug: string, userId: number, role: 'user' | 'admin') {
  const award = await awardBySlug(slug, 'any')
  if (!award) throw createError({ statusCode: 404, statusMessage: 'No such awards' })
  if (award.owner_id !== userId && role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Not your awards' })
  }
  return award
}
