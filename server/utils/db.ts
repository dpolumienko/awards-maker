import { createPool } from 'mysql2/promise'
import type { Pool, PoolConnection } from 'mysql2/promise'

// Ported from the streamawards app, which runs the same shape of site on the same
// stack. One process-wide pool: this is a long-lived Node process, not a Worker,
// so pooling is both allowed and wanted - the ballot path writes.

const QUERY_TIMEOUT_MS = 10_000

let pool: Pool | undefined

/**
 * Names what is missing instead of letting `mysql2` dial a default.
 *
 * `nuxt.config.ts` deliberately leaves host, user and database empty when unset.
 * Without this check `createPool` fills its own blanks - `localhost`, the OS
 * user - and the first query dies deep in the driver with ER_ACCESS_DENIED for a
 * host nobody configured, which reaches the browser as a bare 500 on every page.
 */
function assertConfigured(config: { host: string; user: string; database: string }): void {
  const missing = (['host', 'user', 'database'] as const).filter((key) => !config[key].trim())
  if (missing.length === 0) return

  throw new Error(
    `MySQL is not configured: missing ${missing.join(', ')}. ` +
      `Set MYSQL_HOST, MYSQL_USERNAME and MYSQL_DATABASE in .env (see .env.example), ` +
      `or NUXT_MYSQL_HOST / NUXT_MYSQL_USER / NUXT_MYSQL_DATABASE for a built server.`,
  )
}

export function getPool(): Pool {
  if (!pool) {
    const config = useRuntimeConfig()
    assertConfigured({
      host: String(config.mysql.host),
      user: String(config.mysql.user),
      database: String(config.mysql.database),
    })
    pool = createPool({
      host: String(config.mysql.host),
      port: Number(config.mysql.port),
      user: String(config.mysql.user),
      password: String(config.mysql.password),
      database: String(config.mysql.database),
      waitForConnections: true,
      connectionLimit: 10,
      connectTimeout: QUERY_TIMEOUT_MS,
      // Dates come back as strings so the app formats them itself instead of the
      // driver guessing a timezone. Award dates are calendar days, not instants.
      dateStrings: true,
    })
  }
  return pool
}

export type SqlParam = string | number | boolean | null

export async function query<T = Record<string, unknown>>(
  sql: string,
  params: SqlParam[] = [],
): Promise<T[]> {
  try {
    const [rows] = await getPool().query({ sql, timeout: QUERY_TIMEOUT_MS }, params)
    return rows as T[]
  } catch (error) {
    console.error('[db] Query failed', { sql: sql.slice(0, 120), error })
    throw error
  }
}

/**
 * An INSERT, returning the new id. `query` cannot serve this: mysql2 answers a
 * write with an OkPacket rather than rows, so treating it as `T[]` gives you an
 * object pretending to be an array.
 */
export async function insert(sql: string, params: SqlParam[] = []): Promise<number> {
  const [res] = await getPool().query({ sql, timeout: QUERY_TIMEOUT_MS }, params)
  return Number((res as { insertId?: number }).insertId ?? 0)
}

export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params: SqlParam[] = [],
): Promise<T | null> {
  const rows = await query<T>(sql, params)
  return rows[0] ?? null
}

export async function transaction<T>(fn: (conn: PoolConnection) => Promise<T>): Promise<T> {
  const conn = await getPool().getConnection()
  try {
    await conn.beginTransaction()
    const result = await fn(conn)
    await conn.commit()
    return result
  } catch (error) {
    await conn.rollback()
    throw error
  } finally {
    conn.release()
  }
}
