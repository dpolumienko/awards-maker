import { getPool } from '../utils/db'

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

export default defineNitroPlugin(async () => {
  const config = useRuntimeConfig()
  if (!String(config.mysql.host).trim()) {
    console.warn('[migrate] No database configured - skipping')
    return
  }

  // Read through Nitro's asset storage, not the filesystem: the built server is
  // one bundle and the .sql files live inside it.
  const store = useStorage('assets:migrations')
  const files = (await store.getKeys()).filter((f) => f.endsWith('.sql')).sort()
  if (!files.length) {
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
    const pending = files.filter((f) => !applied.has(f))
    if (!pending.length) return

    for (const file of pending) {
      const sql = String(await store.getItem(file))
      // one statement at a time: the pooled connection is not in
      // multipleStatements mode, and splitting keeps a failure locatable
      for (const statement of sql.split(/;\s*\n/).map((s) => s.trim()).filter(Boolean)) {
        await conn.query(statement)
      }
      await conn.query(`INSERT INTO schema_migrations (filename) VALUES (?)`, [file])
      console.log(`[migrate] applied ${file}`)
    }
  } finally {
    await conn.query(`SELECT RELEASE_LOCK(?)`, [LOCK]).catch(() => {})
    conn.release()
  }
})
