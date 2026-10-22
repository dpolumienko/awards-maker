// The ceremony stage gets two things of its own (review 2026-10-08): a picture
// uploaded in the setup (NULL = none), whether the show's partners sit in a
// corner of every slide (on by default - a sponsor expects to be seen), and
// whether the winner's screen says the vote count and the percentage.
//
// ADD COLUMN cannot be repeated in MySQL; the runner never runs a migration twice.

export const sql = `-- 005: a picture and the partners on the ceremony stage.
ALTER TABLE ceremony_settings
  ADD COLUMN image VARCHAR(512) NULL AFTER reveal,
  ADD COLUMN show_partners TINYINT(1) NOT NULL DEFAULT 1 AFTER image,
  ADD COLUMN show_counts TINYINT(1) NOT NULL DEFAULT 1 AFTER show_partners;
`
