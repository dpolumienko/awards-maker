import { findChannels } from '../../utils/channels'

/**
 * Nominee search in the builder (review 2026-09-25: search the Streams Charts
 * channel base, not a sample list). The lookup itself lives in utils/channels,
 * shared with publishing, which checks every channel again.
 */
export default defineEventHandler(async (event) => {
  const q = String(getQuery(event).q ?? '').trim()
  if (q.length < 2 || q.length > 50) return { channels: [], source: 'none' }
  return findChannels(q)
})
