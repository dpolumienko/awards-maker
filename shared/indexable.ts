import { PUBLISH } from './limits'

// One rule for "should search see this awards page", read by the page (its
// robots tag) and by the sitemap source. They were two rules before, and the
// sitemap listed pages that answered noindex - Search Console reports that as
// "Submitted URL marked noindex" on every one (SEO audit, 2026-09-24).

/** A name trading on the show we do not own: "Streamer Awards" and its spellings. */
export const TRADEMARK = /streamer'?s?\s*awards/i

export const INDEX = {
  /** Two real sentences. A one-word description is the thin page Google skips. */
  minDescription: 80,
} as const

export interface IndexableShape {
  name: string
  description: string
  /** How many categories the show has. */
  categories: number
  /** The fewest nominees in any one category. */
  minNominees: number
}

export function isIndexable(a: IndexableShape): boolean {
  return (
    a.categories >= PUBLISH.minNominations &&
    a.minNominees >= PUBLISH.minNomineesPerNomination &&
    a.description.trim().length >= INDEX.minDescription &&
    // anything trading on the name of the show we do not own stays out
    !TRADEMARK.test(a.name)
  )
}
