// Winners without the numbers (review 2026-10-08): a host can publish the
// results and keep the vote counts and percentages to themselves. 0 = shown.
//
// ADD COLUMN cannot be repeated in MySQL; the runner never runs a migration twice.

export const sql = `-- 006: hide the counts on the public page.
ALTER TABLE awards
  ADD COLUMN hide_counts TINYINT(1) NOT NULL DEFAULT 0 AFTER offline_at;
`
