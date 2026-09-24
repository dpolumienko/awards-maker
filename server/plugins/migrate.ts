import { MIGRATIONS } from '../db/migrations'
import { getPool } from '../utils/db'
import { splitStatements } from '../utils/sql'

// Migrations run when the server boots.
//
// The alternative was a separate step in the deploy, which meant the runtime
// image had to carry mysql2 and its dependency tree alongside the bundle just to
// run one script - a hand-maintained list of packages in the Dockerfile that
// would rot the first time mysql2 changed its deps. The app already has a pool.
//
// Concurrency is handled by a named lock, so two containers coming up together
// do not both try to create the same table: the second waits, then finds
// nothing pending.

const LOCK = 'awards_maker_migrations'

export default defineNitroPlugin(() => {
  // Deliberately not awaited by the boot path, and never allowed to throw: a
  // database that is briefly unreachable must not stop the process from coming
  // up and answering /healthz, or the container restart-loops on top of an
  // outage. What it does instead is say so, loudly, once.
  migrate().catch((error) => {
    console.error('[migrate] Schema not applied:', (error as Error).message)
  })
})

async function migrate() {
  const config = useRuntimeConfig()
  if (!String(config.mysql.host).trim()) {
    console.warn('[migrate] No database configured - skipping')
    return
  }

  if (!MIGRATIONS.length) {
    console.warn('[migrate] No migrations bundled')
    return
  }

  const conn = await getPool().getConnection()
  try {
    const [[lock]] = (await conn.query(`SELECT GET_LOCK(?, 30) AS got`, [LOCK])) as [
      Array<{ got: number | null }>,
      unknown,
    ]
    if (!lock?.got) {
      console.warn('[migrate] Could not take the lock - another instance is migrating')
      return
    }

    await conn.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename   VARCHAR(191) NOT NULL,
        applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (filename)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    const [rows] = (await conn.query(`SELECT filename FROM schema_migrations`)) as [
      Array<{ filename: string }>,
      unknown,
    ]
    const applied = new Set(rows.map((r) => r.filename))
    const pending = MIGRATIONS.filter((m) => !applied.has(m.name))
    if (!pending.length) return

    for (const migration of pending) {
      for (const statement of splitStatements(migration.sql)) {
        await conn.query(statement)
      }
      await conn.query(`INSERT INTO schema_migrations (filename) VALUES (?)`, [migration.name])
      console.log(`[migrate] applied ${migration.name}`)
    }
  } finally {
    await conn.query(`SELECT RELEASE_LOCK(?)`, [LOCK]).catch(() => {})
    conn.release()
  }
}
