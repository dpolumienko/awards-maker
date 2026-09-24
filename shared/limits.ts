// The numbers that decide what a show may do. Both sides read this file: the
// builder to explain a limit before it bites, the API to enforce it, because a
// POST does not have to come from the builder.

export const FREE = {
  maxNominations: 5,
  maxVoters: 200,
  maxActiveAwards: 1,
  nameLimit: 29,
} as const

/** One awards on the paid tier, paid once. Stripe's price (STRIPE_PRICE_ID) has to match. */
export const PAID = {
  priceUsd: 50,
} as const

/**
 * The catalog stays out of sight until there is something to browse (review
 * 2026-09-24, item 12: a catalog of two shows sells the product short). It
 * opens on its own once this many shows are published - no flag to flip.
 */
export const CATALOG = {
  minAwards: 10,
} as const

export const FIELD = {
  descriptionLimit: 200,
} as const

export const PUBLISH = {
  minNominations: 3,
  minNomineesPerNomination: 2,
} as const

/** A show's own look and clip/image nominees are what the paid tier is for. */
export const PAID_LOOK_KEYS = ['theme', 'accent', 'font', 'coverUrl', 'logoUrl'] as const
