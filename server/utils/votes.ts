import { query, queryOne, transaction } from './db'

// Counting is a GROUP BY, never a stored number. The prototype kept a `tally`
// object next to the ballots and they could disagree; here a count that
// disagrees with the ballots is not representable.

export interface Tally {
  voters: number
  /** nomination id -> nominee id -> votes, both as strings, as the client uses. */
  counts: Record<string, Record<string, number>>
  days: Record<string, number>
}

export async function tallyFor(awardId: number): Promise<Tally> {
  const [rows, voters, days] = await Promise.all([
    query<{ nomination_id: number; nominee_id: number; votes: number }>(
      `SELECT p.nomination_id, p.nominee_id, COUNT(*) AS votes
         FROM ballot_picks p
         JOIN ballots b ON b.id = p.ballot_id
        WHERE b.award_id = ?
        GROUP BY p.nomination_id, p.nominee_id`,
      [awardId],
    ),
    queryOne<{ n: number }>(`SELECT COUNT(*) AS n FROM ballots WHERE award_id = ?`, [awardId]),
    query<{ day: string; n: number }>(
      `SELECT DATE(submitted_at) AS day, COUNT(*) AS n
         FROM ballots WHERE award_id = ? GROUP BY DATE(submitted_at) ORDER BY day`,
      [awardId],
    ),
  ])

  const counts: Tally['counts'] = {}
  for (const r of rows) {
    const nomination = String(r.nomination_id)
    counts[nomination] = counts[nomination] ?? {}
    counts[nomination]![String(r.nominee_id)] = Number(r.votes)
  }

  return {
    voters: Number(voters?.n ?? 0),
    counts,
    days: Object.fromEntries(days.map((d) => [String(d.day).slice(0, 10), Number(d.n)])),
  }
}

/** What this person already chose, so a revisit shows their own ballot back. */
export async function ballotFor(awardId: number, userId: number) {
  const ballot = await queryOne<{ id: number; submitted_at: string }>(
    `SELECT id, submitted_at FROM ballots WHERE award_id = ? AND user_id = ? LIMIT 1`,
    [awardId, userId],
  )
  if (!ballot) return null

  const picks = await query<{ nomination_id: number; nominee_id: number }>(
    `SELECT nomination_id, nominee_id FROM ballot_picks WHERE ballot_id = ?`,
    [ballot.id],
  )
  return {
    at: ballot.submitted_at,
    picks: Object.fromEntries(picks.map((p) => [String(p.nomination_id), String(p.nominee_id)])),
  }
}

export class AlreadyVoted extends Error {}

/**
 * One ballot, once. `ballots` has UNIQUE (user_id, award_id), so two requests
 * racing each other end with one row and the loser gets told - the check is the
 * database's, not this function's, which is the only version that holds under
 * concurrency.
 *
 * Picks are validated against the show before anything is written: a nominee id
 * from a different awards, or a second pick in one category, is a 400 rather
 * than a quietly miscounted vote.
 */
export async function castBallot(
  awardId: number,
  userId: number,
  picks: Record<string, string>,
): Promise<{ picks: number }> {
  const pairs = Object.entries(picks)
  if (!pairs.length) throw createError({ statusCode: 400, statusMessage: 'Pick at least one' })

  const valid = await query<{ nomination_id: number; nominee_id: number }>(
    `SELECT m.id AS nomination_id, n.id AS nominee_id
       FROM nominations m JOIN nominees n ON n.nomination_id = m.id
      WHERE m.award_id = ?`,
    [awardId],
  )
  const allowed = new Set(valid.map((v) => `${v.nomination_id}:${v.nominee_id}`))
  for (const [nomination, nominee] of pairs) {
    if (!allowed.has(`${Number(nomination)}:${Number(nominee)}`)) {
      throw createError({ statusCode: 400, statusMessage: 'That nominee is not on this ballot' })
    }
  }

  return transaction(async (conn) => {
    let ballotId: number
    try {
      const [res] = (await conn.query(
        `INSERT INTO ballots (award_id, user_id) VALUES (?, ?)`,
        [awardId, userId],
      )) as [{ insertId: number }, unknown]
      ballotId = res.insertId
    } catch (error) {
      if ((error as { code?: string }).code === 'ER_DUP_ENTRY') throw new AlreadyVoted()
      throw error
    }

    for (const [nomination, nominee] of pairs) {
      await conn.query(
        `INSERT INTO ballot_picks (ballot_id, nomination_id, nominee_id) VALUES (?, ?, ?)`,
        [ballotId, Number(nomination), Number(nominee)],
      )
    }
    return { picks: pairs.length }
  })
}

export async function closeVoting(awardId: number) {
  await query(`UPDATE awards SET closed_at = NOW() WHERE id = ? AND closed_at IS NULL`, [awardId])
}

export async function publishResults(awardId: number) {
  await query(
    `UPDATE awards SET results_at = NOW(), closed_at = COALESCE(closed_at, NOW()) WHERE id = ?`,
    [awardId],
  )
}
