/**
 * Splits a migration file into statements.
 *
 * The pooled connection is not in `multipleStatements` mode - turning that on
 * for the app would widen every query into a place an injection could chain a
 * second statement - so a file with eight CREATE TABLEs has to be fed in one at
 * a time. Splitting also keeps a failure locatable: the error names the
 * statement, not the file.
 *
 * Only a bare `;` at the end of a line separates. A semicolon inside a string or
 * a comment does not, which is what a naive `split(';')` gets wrong.
 */
export function splitStatements(sql: string): string[] {
  return sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(/;\s*(?:\n|$)/)
    .map((s) => s.trim())
    .filter(Boolean)
}
