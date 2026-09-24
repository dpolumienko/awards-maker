// The numbers that decide what a show may do. Both sides read this file: the
// builder to explain a limit before it bites, the API to enforce it, because a
// POST does not have to come from the builder.

export const FREE = {
  maxNominations: 5,
  maxVoters: 200,
  maxActiveAwards: 1,
  nameLimit: 29,
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
