// The three ways to run awards here. One source: the landing section and the
// /plans page read the same array, and the comparison table on that page is
// built from the same feature lists.
//
// Short on purpose (review 2026-09-24: "too many words, nobody reads it"): a
// price, three or four lines, one button. The reasoning lives in the FAQ.
import { FREE, PAID } from '#shared/limits'

export interface Plan {
  id: string
  name: string
  /** The big number. */
  price: string
  /** What the number is for, under it. */
  per: string
  features: string[]
  cta: { label: string; to: string; variant: 'primary' | 'ghost' }
  featured: boolean
}

export const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    per: 'with a Twitch login',
    features: [
      `Up to ${FREE.maxNominations} categories`,
      `${FREE.maxVoters} voters`,
      'One awards at a time',
      'Any channel we track, or plain text',
    ],
    cta: { label: 'Start free', to: '/create', variant: 'ghost' },
    featured: false,
  },
  {
    id: 'paid',
    name: 'One awards',
    price: `$${PAID.priceUsd}`,
    per: 'per awards, paid once',
    features: [
      'Unlimited categories',
      'No cap on voters',
      'Your cover, logo, colour and type',
      'Images and clips as nominees',
    ],
    cta: { label: 'Create your awards', to: '/create', variant: 'primary' },
    featured: true,
  },
  {
    id: 'enterprise',
    name: 'Done for you',
    price: 'Custom',
    per: 'priced per show',
    features: [
      'Categories and nominees set up with you',
      'Branded page and share assets',
      'Moderation watched by our team',
      'Results and audience report',
    ],
    cta: { label: 'Talk to us', to: 'mailto:sales@streamscharts.com', variant: 'ghost' },
    featured: false,
  },
]

/**
 * The comparison table on /plans. Written out row by row on purpose: the three
 * feature lists above are sales copy and are not parallel, and a table built by
 * diffing them would invent rows nobody wrote.
 *
 * `true` prints a tick, `false` a dash, a string prints itself.
 */
export interface CompareRow {
  label: string
  free: boolean | string
  paid: boolean | string
  done: boolean | string
}

export const COMPARISON: { group: string; rows: CompareRow[] }[] = [
  {
    group: 'The show',
    rows: [
      { label: 'Categories', free: '5', paid: 'Unlimited', done: 'Unlimited' },
      { label: 'Unique voters', free: '200', paid: 'No cap', done: 'No cap' },
      { label: 'Awards running at once', free: '1', paid: '1 per purchase', done: 'Agreed with you' },
      { label: 'Nominate any channel we track', free: true, paid: true, done: true },
      { label: 'Plain-text nominees', free: true, paid: true, done: true },
      { label: 'Images and clips as nominees', free: false, paid: true, done: true },
    ],
  },
  {
    group: 'The page',
    rows: [
      { label: 'Public awards page', free: true, paid: true, done: true },
      { label: 'Results stay online afterwards', free: true, paid: true, done: true },
      { label: 'Your cover, logo, colour and type', free: false, paid: true, done: true },
    ],
  },
  {
    group: 'Running it',
    rows: [
      { label: 'Host dashboard with live counts', free: true, paid: true, done: true },
      { label: 'One ballot per Twitch account', free: true, paid: true, done: true },
      { label: 'Moderation watched by our team', free: false, paid: false, done: true },
      { label: 'Categories and nominees set up with you', free: false, paid: false, done: true },
      { label: 'Results and audience report', free: false, paid: false, done: true },
    ],
  },
]
