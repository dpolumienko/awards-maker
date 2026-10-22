// Taking a show offline (review 2026-10-06): the host can pull a published
// awards page without deleting it. Ballots, nominees and settings stay; the
// page, the catalog card, the sitemap entry and voting go away until the host
// puts it back. NULL = online.
//
// ADD COLUMN cannot be repeated in MySQL; the runner never runs a migration twice.

export const sql = `-- 004: offline, without deleting.
ALTER TABLE awards
  ADD COLUMN offline_at DATETIME NULL AFTER results_at;
`
