import { z } from 'zod'

// The one description of what a show looks like coming off the wire. Handlers
// `safeParse` against it and throw their own 400 - a zod error is a map of our
// field names and never goes back to the client.

const platform = z.enum(['twitch', 'kick', 'youtube'])

/** Calendar days, not instants: the builder's date inputs emit exactly this. */
const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .or(z.literal(''))
  .nullable()
  .optional()

export const nomineeSchema = z.object({
  kind: z.enum(['channel', 'text', 'media']),
  text: z.string().max(191).optional(),
  url: z.string().max(1024).optional(),
  // an uploads path we handed out, never a data: URL - see server/api/uploads.post.ts
  image: z.string().max(512).optional(),
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
  opensAt: day,
  closesAt: day,
  ceremonyAt: day,
  look: z.record(z.string(), z.unknown()).default({}),
  host: z.object({ name: z.string().max(191), platform }),
  partners: z.array(z.object({ name: z.string().max(191), url: z.string().max(512) })).max(40).default([]),
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
