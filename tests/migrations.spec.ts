import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { MIGRATIONS } from '../server/db/migrations'
import { splitStatements } from '../server/utils/sql'

// The migrations are fed to MySQL one statement at a time by a splitter we wrote,
// so the splitter and the schema are checked against each other here. Not a
// substitute for running them against a real server, but it catches the failure
// that would otherwise only appear at boot on a production box: a file that
// splits into something that is not a statement, or a migration nobody listed.

const DIR = join(import.meta.dirname, '..', 'server', 'db', 'migrations')

describe('splitStatements', () => {
  it('keeps a semicolon inside a comment out of the split', () => {
    const sql = `-- one; two; three\nCREATE TABLE a (id INT);\nCREATE TABLE b (id INT);`
    expect(splitStatements(sql)).toEqual(['CREATE TABLE a (id INT)', 'CREATE TABLE b (id INT)'])
  })

  it('tolerates a file that does not end with a newline', () => {
    expect(splitStatements('CREATE TABLE a (id INT);')).toEqual(['CREATE TABLE a (id INT)'])
  })

  it('drops blank space between statements', () => {
    expect(splitStatements('CREATE TABLE a (id INT);\n\n\nCREATE TABLE b (id INT);\n')).toHaveLength(2)
  })
})

describe('the migrations themselves', () => {
  it('has at least one', () => {
    expect(MIGRATIONS.length).toBeGreaterThan(0)
  })

  it.each(MIGRATIONS.map((m) => m.name))('%s splits into statements that are all DDL', (name) => {
    const statements = splitStatements(MIGRATIONS.find((m) => m.name === name)!.sql)
    expect(statements.length).toBeGreaterThan(0)
    for (const s of statements) {
      expect(s).toMatch(/^(CREATE|ALTER|DROP|INSERT|UPDATE)\b/i)
    }
  })

  it.each(MIGRATIONS.map((m) => m.name))('%s is safe to re-run', (name) => {
    for (const s of splitStatements(MIGRATIONS.find((m) => m.name === name)!.sql)) {
      // Re-running is how a half-applied migration gets fixed, and how a second
      // container coming up behind the first stays harmless.
      if (/^CREATE TABLE/i.test(s)) expect(s).toMatch(/^CREATE TABLE IF NOT EXISTS/i)
      expect(s).not.toMatch(/^DROP\b/i)
    }
  })

  it('creates each table exactly once, and creates the ones the app is written against', () => {
    const seen = new Set<string>()
    for (const migration of MIGRATIONS) {
      for (const s of splitStatements(migration.sql)) {
        const match = /^CREATE TABLE IF NOT EXISTS (\w+)/i.exec(s)
        if (!match) continue
        expect(seen.has(match[1]!)).toBe(false)
        seen.add(match[1]!)
      }
    }
    expect([...seen].sort()).toEqual([
      'awards',
      'ballot_picks',
      'ballots',
      'ceremony_settings',
      'nominations',
      'nominees',
      'orders',
      'partners',
      'payment_events',
      'reports',
      'social_accounts',
      'users',
    ])
  })

  it('puts the rules in the schema rather than only in the handlers', () => {
    const all = MIGRATIONS.map((m) => m.sql).join('\n')
    // one ballot per person per show
    expect(all).toMatch(/UNIQUE KEY uq_ballots_user_award \(user_id, award_id\)/)
    // one pick per category per ballot
    expect(all).toMatch(/UNIQUE KEY uq_picks_ballot_nomination \(ballot_id, nomination_id\)/)
    // a webhook delivered twice cannot be applied twice
    expect(all).toMatch(/UNIQUE KEY uq_payment_events_event \(provider, event_id\)/)
    // one row per Twitch identity, so the sign-in upsert cannot race into two
    expect(all).toMatch(/UNIQUE KEY uq_social_provider_user \(provider, provider_user_id\)/)
  })

  it('lists every migration module, in order', () => {
    // The plugin imports MIGRATIONS rather than reading the directory, so a
    // module added without a line in index.ts would silently never run.
    const modules = readdirSync(DIR)
      .filter((f) => f.endsWith('.ts') && f !== 'index.ts')
      .map((f) => f.replace(/\.ts$/, ''))
      .sort()
    expect(MIGRATIONS.map((m) => m.name)).toEqual(modules)
  })
})
