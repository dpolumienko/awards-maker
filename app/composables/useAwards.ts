import type { Award } from '~/types/award'

// Reading shows. The prototype answered every one of these out of one shared
// `published` array in localStorage, which is why the catalog and the award page
// had to be client-rendered and a crawler saw an empty shell. These are the
// fetches that let both go back to SSR.

export interface AwardSummary {
  slug: string
  name: string
  description: string
  opensAt: string
  closesAt: string
  ceremonyAt: string
  look: Award['look']
  host: Award['host']
  tier: 'free' | 'paid'
  status: 'draft' | 'published'
  closedAt?: string
  resultsAt?: string
  publishedAt?: string
  voters: number
  categories: number
}

export interface Tally {
  voters: number
  counts: Record<string, Record<string, number>>
  days: Record<string, number>
}

export interface AwardPage {
  award: Award & { tier: 'free' | 'paid'; closedAt?: string; resultsAt?: string }
  isHost: boolean
  ballot: { at: string; picks: Record<string, string> } | null
  tally: Tally | null
  voters: number
}

/**
 * The public catalog. Rendered on the server - it is the page that ranks.
 *
 * `tolerant` is for the landing's showcase strip, which is one section of a page
 * that is mostly copy: a database hiccup should hide the row, not take the whole
 * landing down. /catalog itself is NOT tolerant, deliberately - an empty catalog
 * answering 200 during an outage is a page a crawler would happily index as
 * "this site has no shows".
 */
export function useCatalog(options: { tolerant?: boolean } = {}) {
  return useFetch<{ awards: AwardSummary[] }>('/api/awards', {
    key: 'catalog',
    default: () => ({ awards: [] }),
    ...(options.tolerant
      ? {
          $fetch: (async (...args: Parameters<typeof $fetch>) => {
            try {
              return await $fetch(...args)
            } catch {
              return { awards: [] }
            }
          }) as typeof $fetch,
        }
      : {}),
  })
}

/**
 * The host's own shows, drafts included. Only asked for when there is a session:
 * the header calls this on every page, and an anonymous visitor does not need a
 * 401 per navigation to be told they have no shows.
 */
export function useMyAwards() {
  const { loggedIn } = useUserSession()
  return useFetch<{ awards: AwardSummary[] }>('/api/mine', {
    key: 'my-awards',
    default: () => ({ awards: [] }),
    immediate: loggedIn.value,
    watch: [loggedIn],
  })
}

/** One published show, with whatever this viewer is entitled to see of it. */
export function useAwardPage(slug: () => string) {
  return useFetch<AwardPage>(() => `/api/awards/${encodeURIComponent(slug())}`, {
    key: () => `award:${slug()}`,
  })
}

/**
 * Counts on demand. The award page already carries a tally for the host and for
 * everyone once results are out; this is for the dashboard, which refetches
 * after closing voting.
 */
export function fetchTally(slug: string) {
  return $fetch<{ tally: Tally; isHost: boolean }>(`/api/awards/${encodeURIComponent(slug)}/tally`)
}
