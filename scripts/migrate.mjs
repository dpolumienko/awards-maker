#!/usr/bin/env node
// Applies pending migrations against the database in .env, without starting the
// app. The app applies them itself on boot, so this is for a one-off check or
// for running them against a database the app is not pointed at yet.
//
//   npm run migrate            apply what is missing
//   npm run migrate -- --status   list without applying
import mysql from 'mysql2/promise'
import { MIGRATIONS } from '../server/db/migrations/index.ts'
import { splitStatements } from '../server/utils/sql.ts'

const config = {
  host: process.env.MYSQL_HOST || process.env.NUXT_MYSQL_HOST || '',
  port: Number(process.env.MYSQL_PORT || process.env.NUXT_MYSQL_PORT || 3306),
  user: process.env.MYSQL_USERNAME || process.env.NUXT_MYSQL_USER || '',
  password: process.env.MYSQL_PASSWORD || process.env.NUXT_MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || process.env.NUXT_MYSQL_DATABASE || '',
}

const missing = ['host', 'user', 'database'].filter((k) => !String(config[k]).trim())
if (missing.length) {
  console.error(`Cannot migrate: missing ${missing.join(', ')}. See .env.example.`)
  process.exit(1)
}

const statusOnly = process.argv.includes('--status')
const conn = await mysql.createConnection(config)

try {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   VARCHAR(191) NOT NULL,
      applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (filename)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  const [rows] = await conn.query('SELECT filename FROM schema_migrations')
  const applied = new Set(rows.map((r) => r.filename))

  if (statusOnly) {
    for (const m of MIGRATIONS) console.log(`${applied.has(m.name) ? 'applied' : 'PENDING'}  ${m.name}`)
    process.exit(0)
  }

  const pending = MIGRATIONS.filter((m) => !applied.has(m.name))
  if (!pending.length) {
    console.log(`Nothing to do - ${MIGRATIONS.length} migration(s) already applied.`)
    process.exit(0)
  }

  for (const migration of pending) {
    process.stdout.write(`applying ${migration.name} ... `)
    for (const statement of splitStatements(migration.sql)) await conn.query(statement)
    await conn.query('INSERT INTO schema_migrations (filename) VALUES (?)', [migration.name])
    console.log('ok')
  }
  console.log(`Applied ${pending.length} migration(s).`)
} finally {
  await conn.end()
}
