import type { PoolConnection } from 'mysql2/promise'
import { queryOne, transaction } from './db'

/** Where an account signs in from. Nominees can be on YouTube too; logins cannot. */
export type Provider = 'twitch' | 'kick'

/** What Kick's public /users returns for the person who just signed in. */
export interface KickProfile {
  user_id: string | number
  name: string
  email?: string
  profile_picture?: string
}

/** What Twitch's Helix /users returns for the person who just signed in. */
export interface TwitchProfile {
  id: string
  login: string
  display_name: string
  profile_image_url?: string
  email?: string
}

export interface SessionUser {
  id: number
  login: string
  name: string
  avatar: string | null
  role: 'user' | 'admin'
  platform: Provider
  /**
   * Whether this sign-in carried the scopes a show needs. Creating an awards
   * reads the channel's subscribers and followers, so it goes through
   * /auth/twitch-host or /auth/kick-host; voting needs an identity and nothing else.
   */
  host: boolean
}

/** The scope that separates a host sign-in from a voter one, per provider. */
export const HOST_SCOPE = 'channel:read:subscriptions'
const KICK_HOST_SCOPE = 'channel:read'

/**
 * What Streams Charts asks for on `?with=subs`, read off its own login redirect
 * rather than guessed. Subscribers and followers are what a show can gate voting
 * on; the rest is parity with SC, so a channel that has already consented there
 * sees nothing new here.
 */
export const HOST_SCOPES = [
  'user:read:email',
  HOST_SCOPE,
  'user:read:follows',
  'moderator:read:followers',
  'moderator:read:chatters',
  'channel:read:charity',
  'channel:read:polls',
  'channel:read:goals',
  'bits:read',
  'chat:read',
]

/** A voter only has to be a person, so this is the whole ask. */
export const VOTER_SCOPES = ['user:read:email']

/**
 * Kick, the same two doors. The host set is what Streams Charts asks Kick for,
 * read off its own login redirect (streamscharts.com/login?social=kick, with and
 * without `with=subs` - the same set either way), not guessed. A voter gets
 * `user:read`, Kick's identity scope, which also carries the email.
 */
export const KICK_HOST_SCOPES = ['user:read', KICK_HOST_SCOPE, 'events:subscribe']
export const KICK_VOTER_SCOPES = ['user:read']

/**
 * Whether a sign-in's granted scopes are a host's. Matched as whole words:
 * Twitch's `channel:read:subscriptions` is not Kick's `channel:read`.
 */
export function hostScopes(provider: Provider, scopes: string | null | undefined): boolean {
  return (scopes ?? '').split(/\s+/).includes(provider === 'kick' ? KICK_HOST_SCOPE : HOST_SCOPE)
}

/** Twitch hands scopes back as a list, Kick as one space-separated string. */
export function scopeList(scope: string[] | string | undefined, asked: string[]): string {
  const got = Array.isArray(scope) ? scope : scope ? scope.split(/\s+/) : []
  return (got.length ? got : asked).join(' ')
}

interface Tokens {
  access_token: string
  refresh_token?: string
  expires_in?: number
  scope?: string[] | string
}

/**
 * Records the tokens a provider handed over, and what they are good for.
 * `social_accounts` has a unique index on (provider, provider_user_id), so this
 * is a real upsert.
 */
async function saveTokens(conn: PoolConnection, userId: number, provider: Provider, providerUserId: string, tokens: Tokens, scopes: string) {
  await conn.query(
    `INSERT INTO social_accounts
       (user_id, provider, provider_user_id, access_token, refresh_token, scopes, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       user_id = VALUES(user_id),
       access_token = VALUES(access_token),
       refresh_token = COALESCE(VALUES(refresh_token), refresh_token),
       scopes = VALUES(scopes),
       expires_at = VALUES(expires_at)`,
    [
      userId,
      provider,
      providerUserId,
      tokens.access_token,
      tokens.refresh_token ?? null,
      scopes,
      tokens.expires_in ? tokenExpiryAt(tokens.expires_in) : null,
    ],
  )
}

/** `social_accounts.expires_at` holds a MySQL DATETIME, not an instant. */
export function tokenExpiryAt(expiresInSeconds: number, now: Date = new Date()): string {
  return new Date(now.getTime() + expiresInSeconds * 1000).toISOString().slice(0, 19).replace('T', ' ')
}

function adminLogins(): Set<string> {
  const raw = String(useRuntimeConfig().adminTwitchLogins || '')
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  )
}

/**
 * Resolves a Twitch identity to a row in `users`, creating it on first sign-in,
 * and records the tokens and the scopes they were granted with.
 *
 * `social_accounts` has a unique index on (provider, provider_user_id), so this
 * is a real upsert - two simultaneous first sign-ins cannot produce two rows.
 */
export async function upsertTwitchUser(profile: TwitchProfile, tokens: Tokens, grantedScopes: string[]): Promise<SessionUser> {
  const login = profile.login.toLowerCase()
  const name = profile.display_name || profile.login
  const avatar = profile.profile_image_url || null
  const role = adminLogins().has(login) ? 'admin' : 'user'
  const scopes = scopeList(tokens.scope, grantedScopes)

  return transaction(async (conn) => {
    await conn.query(
      `INSERT INTO users (twitch_id, login, display_name, email, avatar, role)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         login = VALUES(login),
         display_name = VALUES(display_name),
         email = COALESCE(VALUES(email), email),
         avatar = VALUES(avatar),
         -- an account promoted to admin in .env is promoted on next sign-in, but
         -- an admin already in the table is never demoted by a missing entry
         role = IF(VALUES(role) = 'admin', 'admin', role)`,
      [profile.id, login, name, profile.email ?? null, avatar, role],
    )

    const [rows] = (await conn.query(`SELECT id, role FROM users WHERE twitch_id = ? LIMIT 1`, [
      profile.id,
    ])) as [Array<{ id: number; role: 'user' | 'admin' }>, unknown]
    const user = rows[0]!

    await saveTokens(conn, user.id, 'twitch', profile.id, tokens, scopes)

    return {
      id: user.id,
      login,
      name,
      avatar,
      role: user.role,
      platform: 'twitch',
      host: hostScopes('twitch', scopes),
    }
  })
}

/**
 * The same for a Kick account. Kick users have no twitch_id, so their identity
 * is the social_accounts row: found and locked first, and only created - user
 * row and all - when there is none. A Kick account and a Twitch account of the
 * same person are two users; linking them is not something this does.
 */
export async function upsertKickUser(profile: KickProfile, tokens: Tokens, grantedScopes: string[]): Promise<SessionUser> {
  const kickId = String(profile.user_id)
  const login = profile.name.toLowerCase()
  const name = profile.name
  const avatar = profile.profile_picture || null
  const scopes = scopeList(tokens.scope, grantedScopes)

  return transaction(async (conn) => {
    const [found] = (await conn.query(
      `SELECT u.id, u.role FROM social_accounts s JOIN users u ON u.id = s.user_id
        WHERE s.provider = 'kick' AND s.provider_user_id = ? LIMIT 1 FOR UPDATE`,
      [kickId],
    )) as [Array<{ id: number; role: 'user' | 'admin' }>, unknown]
    let user = found[0]
    if (user) {
      await conn.query(`UPDATE users SET login = ?, display_name = ?, email = COALESCE(?, email), avatar = ? WHERE id = ?`, [
        login,
        name,
        profile.email ?? null,
        avatar,
        user.id,
      ])
    } else {
      const [res] = (await conn.query(
        `INSERT INTO users (twitch_id, login, display_name, email, avatar, role) VALUES (NULL, ?, ?, ?, ?, 'user')`,
        [login, name, profile.email ?? null, avatar],
      )) as [{ insertId: number }, unknown]
      user = { id: res.insertId, role: 'user' }
    }

    await saveTokens(conn, user.id, 'kick', kickId, tokens, scopes)

    return { id: user.id, login, name, avatar, role: user.role, platform: 'kick', host: hostScopes('kick', scopes) }
  })
}

/**
 * The session is a cookie and cookies outlive database rows, so anything that
 * grants power - the role, the host flag - is re-read here rather than trusted
 * from what was sealed into the cookie at sign-in.
 */
export async function currentUser(event: Parameters<typeof getUserSession>[0]) {
  const session = await getUserSession(event)
  const sealed = session?.user as SessionUser | undefined
  if (!sealed?.id) return null

  // one account per user - a Twitch user or a Kick user - so the latest row is it
  const row = await queryOne<{
    id: number
    login: string
    display_name: string
    avatar: string | null
    role: 'user' | 'admin'
    provider: Provider | null
    scopes: string | null
  }>(
    `SELECT u.id, u.login, u.display_name, u.avatar, u.role, s.provider, s.scopes
       FROM users u
       LEFT JOIN social_accounts s ON s.user_id = u.id
      WHERE u.id = ?
      ORDER BY s.updated_at DESC LIMIT 1`,
    [sealed.id],
  )
  if (!row) return null
  const platform = row.provider ?? 'twitch'

  return {
    id: row.id,
    login: row.login,
    name: row.display_name,
    avatar: row.avatar,
    role: row.role,
    platform,
    host: hostScopes(platform, row.scopes),
  } satisfies SessionUser
}

/** 401 unless somebody is signed in. */
export async function requireUser(event: Parameters<typeof getUserSession>[0]) {
  const user = await currentUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Sign in first' })
  return user
}

/** 403 unless they signed in through the host flow, so we hold the show scopes. */
export async function requireHost(event: Parameters<typeof getUserSession>[0]) {
  const user = await requireUser(event)
  if (!user.host) {
    throw createError({ statusCode: 403, statusMessage: 'Sign in with channel access to run a show' })
  }
  return user
}
