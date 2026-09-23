// The three ways to run awards here. One source: the landing section and the
// /plans page read the same array, and the comparison table on that page is
// built from the same feature lists.
//
// No figure on the paid tier yet: the price is a range, not a decision. Nothing
// here invents one.

export interface Plan {
  id: string
  name: string
  price: string
  blurb: string
  features: string[]
  cta: { label: string; to: string; variant: 'primary' | 'ghost' }
  note: string
  featured: boolean
  badge: string
}

export const PLANS: Plan[] = [

  {
    id: 'free',
    name: 'Free',
    price: 'Free, with a Twitch login',
    blurb: 'Enough to run a real show for one community.',
    features: [
      'Up to 5 nominations',
      'One awards running at a time',
      '200 unique voters',
      'Nominate any channel we track, or plain text',
      'Public page, catalog listing, results that stay up',
    ],
    cta: { label: 'Start free', to: '/create', variant: 'ghost' },
    note: 'Enough for a first season on a small channel.',
    featured: false,
    badge: '',
  },
  {
    id: 'paid',
    name: 'One awards',
    price: 'One-off purchase, no subscription',
    blurb: 'Everything above, without the ceilings - and the page looks like your channel, not like us.',
    features: [
      'Unlimited nominations',
      'No cap on voters',
      'Your cover, logo, colour and type',
      'Images and clips as nominees',
      'Minimum account age for voters',
    ],
    cta: { label: 'Get early access', to: '/plans#early-access', variant: 'primary' },
    note: 'Ships before December. Early access holds your price.',
    featured: true,
    badge: 'Most shows end up here',
  },
  {
    id: 'enterprise',
    name: 'Done for you',
    price: 'By contact',
    blurb: 'You bring the audience, we run the production.',
    features: [
      'We set up the categories and nominees with you',
      'Branded page and share assets',
      'Moderation and anti-fraud watched by our team',
      'A run of show for the reveal stream',
      'Results and audience report after the show',
    ],
    cta: { label: 'Talk to us', to: 'mailto:sales@streamscharts.com', variant: 'ghost' },
    note: 'For agencies, brands and large channels.',
    featured: false,
    badge: '',
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
      { label: 'Public page and catalog listing', free: true, paid: true, done: true },
      { label: 'Results stay online afterwards', free: true, paid: true, done: true },
      { label: 'Your cover, logo, colour and type', free: false, paid: true, done: true },
    ],
  },
  {
    group: 'Running it',
    rows: [
      { label: 'Host dashboard with live counts', free: true, paid: true, done: true },
      { label: 'One ballot per Twitch account', free: true, paid: true, done: true },
      { label: 'Minimum account age for voters', free: false, paid: true, done: true },
      { label: 'Moderation watched by our team', free: false, paid: false, done: true },
      { label: 'Categories and nominees set up with you', free: false, paid: false, done: true },
      { label: 'Results and audience report', free: false, paid: false, done: true },
    ],
  },
]
