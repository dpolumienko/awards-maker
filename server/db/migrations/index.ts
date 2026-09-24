// Every migration, in order.
//
// Listed rather than globbed: the plugin imports this array, so a migration that
// is not on it never runs. One line per migration, which doubles as the review
// checklist, and the suite fails if a module in this directory is missing from
// the list.
//
// The .ts extension is on the import on purpose: scripts/migrate.mjs runs this
// through plain Node, which needs it. The bundler does not mind either way.
import { sql as initial } from './001_initial.ts'

export const MIGRATIONS: { name: string; sql: string }[] = [
  { name: '001_initial', sql: initial },
]
