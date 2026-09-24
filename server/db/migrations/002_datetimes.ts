// Dates become instants, and a show gets a time zone (review 2026-09-24, item 13).
//
// The three DATE columns meant "voting opens at 00:00 and closes at 23:59:59"
// in no zone in particular. They become DATETIME holding UTC, and `timezone`
// holds the IANA zone the host runs the show in - the zone every page shows
// times in.
//
// Existing rows keep their meaning: MODIFY turns a DATE into that day at 00:00,
// and a closing date is then moved to the last second of its day, as it was
// read before. They are read as UTC days, the zone they are given.
//
// Order matters for a retry after a partial failure: the MODIFYs can run twice,
// the UPDATE only touches closing times still sitting at midnight, and the ADD
// COLUMN - which cannot be repeated in MySQL - comes last.

export const sql = `-- 002: instants and a zone.
ALTER TABLE awards
  MODIFY opens_at    DATETIME NULL,
  MODIFY closes_at   DATETIME NULL,
  MODIFY ceremony_at DATETIME NULL;

UPDATE awards
   SET closes_at = closes_at + INTERVAL 86399 SECOND
 WHERE closes_at IS NOT NULL AND TIME(closes_at) = '00:00:00';

ALTER TABLE awards
  ADD COLUMN timezone VARCHAR(64) NOT NULL DEFAULT 'UTC' AFTER ceremony_at;
`
