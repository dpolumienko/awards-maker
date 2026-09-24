import { queryOne, transaction } from './db'

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
  /**
   * Whether this sign-in carried the scopes a show needs. Creating an awards
   * reads the channel's subscribers and followers, so it goes through
   * /auth/twitch/host; voting needs an identity and nothing else.
   */
  host: boolean
}

const PROVIDER = 'twitch'

/** The scope that separates a host sign-in from a voter one. */
export const HOST_SCOPE = 'channel:read:subscriptions'

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
export async function upsertTwitchUser(
  profile: TwitchProfile,
  tokens: { access_token: string; refresh_token?: string; expires_in?: number; scope?: string[] },
  grantedScopes: string[],
): Promise<SessionUser> {
  const login = profile.login.toLowerCase()
  const name = profile.display_name || profile.login
  const avatar = profile.profile_image_url || null
  const role = adminLogins().has(login) ? 'admin' : 'user'
  const scopes = (tokens.scope?.length ? tokens.scope : grantedScopes).join(' ')

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
        user.id,
        PROVIDER,
        profile.id,
        tokens.access_token,
        tokens.refresh_token ?? null,
        scopes,
        tokens.expires_in ? tokenExpiryAt(tokens.expires_in) : null,
      ],
    )

    return {
      id: user.id,
      login,
      name,
      avatar,
      role: user.role,
      host: scopes.includes(HOST_SCOPE),
    }
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

  const row = await queryOne<{ id: number; login: string; display_name: string; avatar: string | null; role: 'user' | 'admin'; scopes: string | null }>(
    `SELECT u.id, u.login, u.display_name, u.avatar, u.role, s.scopes
       FROM users u
       LEFT JOIN social_accounts s ON s.user_id = u.id AND s.provider = ?
      WHERE u.id = ? LIMIT 1`,
    [PROVIDER, sealed.id],
  )
  if (!row) return null

  return {
    id: row.id,
    login: row.login,
    name: row.display_name,
    avatar: row.avatar,
    role: row.role,
    host: Boolean(row.scopes?.includes(HOST_SCOPE)),
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
