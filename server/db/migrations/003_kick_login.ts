// Kick sign-in (review 2026-10-06): a user no longer has to be a Twitch account.
//
// `users.twitch_id` was the identity column and NOT NULL. A Kick account has no
// Twitch id, so the column becomes optional and the identity of a Kick user is
// its row in social_accounts, keyed (provider, provider_user_id). The unique
// index on twitch_id stays: MySQL allows any number of NULLs in it.
//
// A MODIFY to the same definition is a no-op, so a retry is safe.

export const sql = `-- 003: users may come from Kick.
ALTER TABLE users
  MODIFY twitch_id VARCHAR(64) NULL;
`
