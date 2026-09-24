#!/usr/bin/env node
// Applies server/db/migrations/*.sql in filename order, once each.
//
// No migration library. The whole mechanism is a table of filenames and a loop,
// which is less code than configuring one and leaves the SQL readable as SQL.
// Re-running is a no-op; every file is also written to be idempotent on its own,
// so a half-applied file can be fixed and re-run.
//
//   node scripts/migrate.mjs            apply what is missing
//   node scripts/migrate.mjs --status   list without applying
import { readdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import mysql from 'mysql2/promise'

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'server', 'db', 'migrations')

const config = {
  host: process.env.MYSQL_HOST || process.env.NUXT_MYSQL_HOST || '',
  port: Number(process.env.MYSQL_PORT || process.env.NUXT_MYSQL_PORT || 3306),
  user: process.env.MYSQL_USERNAME || process.env.NUXT_MYSQL_USER || '',
  password: process.env.MYSQL_PASSWORD || process.env.NUXT_MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || process.env.NUXT_MYSQL_DATABASE || '',
}

const missing = ['host', 'user', 'database'].filter((k) => !String(config[k]).trim())
if (missing.length) {
  console.error(`Cannot migrate: missing ${missing.join(', ')}. Set MYSQL_HOST, MYSQL_USERNAME and MYSQL_DATABASE (see .env.example).`)
  process.exit(1)
}

const statusOnly = process.argv.includes('--status')

// `multipleStatements` is what lets one file hold several CREATE TABLEs. It is
// safe here because the only SQL this script ever runs is files in the repo.
const conn = await mysql.createConnection({ ...config, multipleStatements: true })

try {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   VARCHAR(191) NOT NULL,
      applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (filename)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  const files = (await readdir(DIR)).filter((f) => f.endsWith('.sql')).sort()
  const [rows] = await conn.query('SELECT filename FROM schema_migrations')
  const applied = new Set(rows.map((r) => r.filename))

  const pending = files.filter((f) => !applied.has(f))
  if (statusOnly) {
    for (const f of files) console.log(`${applied.has(f) ? 'applied' : 'PENDING'}  ${f}`)
    process.exit(0)
  }

  if (!pending.length) {
    console.log(`Nothing to do - ${files.length} migration(s) already applied.`)
    process.exit(0)
  }

  for (const file of pending) {
    const sql = await readFile(join(DIR, file), 'utf8')
    process.stdout.write(`applying ${file} ... `)
    await conn.query(sql)
    await conn.query('INSERT INTO schema_migrations (filename) VALUES (?)', [file])
    console.log('ok')
  }
  console.log(`Applied ${pending.length} migration(s).`)
} finally {
  await conn.end()
}
