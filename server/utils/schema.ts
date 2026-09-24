import { z } from 'zod'
import { isTimeZone } from '#shared/time'

// The one description of what a show looks like coming off the wire. Handlers
// `safeParse` against it and throw their own 400 - a zod error is a map of our
// field names and never goes back to the client.

const platform = z.enum(['twitch', 'kick', 'youtube'])

/**
 * A link a visitor will click: http(s) only. A bare "loot.gg" is read as
 * https://loot.gg rather than becoming a relative link to a 404, and anything
 * with another scheme - javascript:, data: - is refused (QA P1: a partner link
 * was rendered as href="javascript:…" on the public page).
 */
const webUrl = z.preprocess(
  (v) => {
    if (typeof v !== 'string') return v
    const t = v.trim()
    if (!t) return ''
    return /^[a-z][a-z0-9+.-]*:/i.test(t) ? t : `https://${t.replace(/^\/+/, '')}`
  },
  z.string().max(1024).refine((v) => v === '' || /^https?:\/\/[^\s/]+\.[^\s]+/i.test(v), 'not a web address'),
)

/**
 * An instant (ISO 8601 with a zone or Z), or a bare YYYY-MM-DD from a builder
 * that predates times - shared/time.ts `toInstant` reads that in the show's zone.
 */
const instant = z
  .string()
  .max(40)
  .refine((v) => v === '' || /^\d{4}-\d{2}-\d{2}$/.test(v) || !Number.isNaN(Date.parse(v)), 'not a date')
  .nullable()
  .optional()

export const nomineeSchema = z.object({
  kind: z.enum(['channel', 'text', 'media']),
  text: z.string().max(191).optional(),
  url: webUrl.optional(),
  // an uploads path we handed out, never a data: URL - see server/api/uploads.post.ts
  image: z.string().max(512).regex(/^\/uploads\/[\w-]+\/[\w.-]+$/).or(z.literal('')).optional(),
  channel: z
    .object({
      name: z.string().max(191),
      platform,
      followers: z.number().int().nonnegative().optional(),
    })
    .optional(),
})

export const awardInputSchema = z.object({
  name: z.string().max(191).default(''),
  description: z.string().max(500).default(''),
  templateId: z.string().max(64).nullable().optional(),
  opensAt: instant,
  closesAt: instant,
  ceremonyAt: instant,
  // IANA zone the show runs in; anything the runtime does not know is refused
  timezone: z.string().max(64).refine(isTimeZone, 'unknown time zone').optional(),
  look: z.record(z.string(), z.unknown()).default({}),
  host: z.object({ name: z.string().max(191), platform }),
  partners: z.array(z.object({ name: z.string().max(191), url: webUrl })).max(40).default([]),
  nominations: z
    .array(z.object({ title: z.string().max(191), nominees: z.array(nomineeSchema).max(60) }))
    .max(60)
    .default([]),
})

export type AwardInputPayload = z.infer<typeof awardInputSchema>

/** `{ nominationId: nomineeId }`, both as the strings the client works in. */
export const ballotSchema = z.object({
  picks: z.record(z.string().regex(/^\d+$/), z.string().regex(/^\d+$/)),
})

export const ceremonySchema = z.object({
  stage: z.string().max(64),
  font: z.string().max(64),
  reveal: z.enum(['cut', 'spotlight', 'flip']),
})

export const reportSchema = z.object({
  slug: z.string().max(80),
  reason: z.string().min(1).max(500),
})

/** Rejects a body that failed to parse, without echoing our field names back. */
export function parseOr400<T>(schema: { safeParse: (v: unknown) => { success: boolean; data?: T } }, body: unknown, message: string): T {
  const parsed = schema.safeParse(body)
  if (!parsed.success || parsed.data === undefined) {
    throw createError({ statusCode: 400, statusMessage: message })
  }
  return parsed.data
}
