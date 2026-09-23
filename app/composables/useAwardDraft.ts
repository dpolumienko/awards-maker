import { computed, ref, watch } from 'vue'
import { FREE, PUBLISH, type Award, type Nomination, type Nominee, type Partner } from '~/types/award'

const DRAFT_KEY = 'awards-maker:draft'
const PUBLISHED_KEY = 'awards-maker:published'

const uid = () => Math.random().toString(36).slice(2, 9)

export const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'awards'

const emptyNomination = (): Nomination => ({ id: uid(), title: '', nominees: [] })

const emptyDraft = (): Award => ({
  slug: '',
  name: '',
  description: '',
  opensAt: '',
  closesAt: '',
  ceremonyAt: '',
  nominations: [emptyNomination()],
  partners: [],
  look: {},
  host: { name: 'ishowspeed', platform: 'youtube' },
})

/**
  * A draft saved before the demo channel changed carries the old host, and the
  * page then shows a name nobody recognises. Anything stored under the previous
  * default is moved onto the current account when it is read back.
  */
const LEGACY_HOSTS = ['stintik']

// One draft per browser until there is a backend; the shape is the future API shape.
const draft = ref<Award>(emptyDraft())
const published = ref<Award[]>([])
let hydrated = false

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

/**
 * Drafts saved before a field existed come back without it - a draft stored
 * before `look` was added crashed the builder on read. Anything loaded from
 * storage is filled in against the current shape.
 */
function normalize(a: Partial<Award> | undefined): Award {
  const base = emptyDraft()
  if (!a) return base
  const host = { ...base.host, ...(a.host ?? {}) }
  if (LEGACY_HOSTS.includes(host.name)) Object.assign(host, base.host)
  return {
    ...base,
    ...a,
    host,
    look: { ...base.look, ...(a.look ?? {}) },
    partners: Array.isArray(a.partners) ? a.partners : [],
    nominations:
      Array.isArray(a.nominations) && a.nominations.length
        ? a.nominations.map((n) => ({ ...emptyNomination(), ...n, nominees: Array.isArray(n?.nominees) ? n.nominees : [] }))
        : [emptyNomination()],
  }
}

export function useAwardDraft() {
  if (import.meta.client && !hydrated) {
    hydrated = true
    draft.value = normalize(read<Partial<Award> | undefined>(DRAFT_KEY, undefined))
    published.value = read<Partial<Award>[]>(PUBLISHED_KEY, []).map(normalize)
    watch(draft, (v) => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(v))
      } catch {
        /* private window, nothing to do */
      }
    }, { deep: true })
  }

  const nominationsUsed = computed(() => draft.value.nominations.length)
  const atNominationLimit = computed(() => nominationsUsed.value >= FREE.maxNominations)

  /** Always adds. Past the free limit the nomination is simply marked as paid. */
  function addNomination() {
    draft.value.nominations.push(emptyNomination())
    return true
  }
  function removeNomination(id: string) {
    draft.value.nominations = draft.value.nominations.filter((n) => n.id !== id)
    if (!draft.value.nominations.length) draft.value.nominations.push(emptyNomination())
  }
  function addNominee(nominationId: string, nominee: Omit<Nominee, 'id'>) {
    const n = draft.value.nominations.find((x) => x.id === nominationId)
    if (!n) return
    n.nominees.push({ ...nominee, id: uid() } as Nominee)
  }
  function removeNominee(nominationId: string, nomineeId: string) {
    const n = draft.value.nominations.find((x) => x.id === nominationId)
    if (n) n.nominees = n.nominees.filter((x) => x.id !== nomineeId)
  }
  function addPartner() {
    draft.value.partners.push({ id: uid(), name: '', url: '' } as Partner)
  }
  function removePartner(id: string) {
    draft.value.partners = draft.value.partners.filter((p) => p.id !== id)
  }

  /** Everything in the draft that the free plan does not cover. */
  const paidFeatures = computed(() => {
    const d = draft.value
    const out: { id: string; label: string; detail: string }[] = []
    if ((d.nominations?.length ?? 0) > FREE.maxNominations) {
      out.push({
        id: 'nominations',
        label: `${d.nominations.length} nominations`,
        detail: `Free covers ${FREE.maxNominations}. The last ${d.nominations.length - FREE.maxNominations} would be dropped.`,
      })
    }
    const look = [d.look?.theme && 'theme', d.look?.accent && 'colour', d.look?.font && 'type', d.look?.coverUrl && 'cover'].filter(Boolean)
    if (look.length) {
      out.push({ id: 'look', label: `Your own ${look.join(', ')}`, detail: 'Free awards use the standard page.' })
    }
    const media = (d.nominations ?? []).flatMap((n) => n.nominees ?? []).filter((n) => n.kind === 'media').length
    if (media) {
      out.push({ id: 'media', label: `${media} image or clip ${media === 1 ? 'nominee' : 'nominees'}`, detail: 'Free nominees are channels or text.' })
    }
    return out
  })
  const usesPaid = computed(() => paidFeatures.value.length > 0)

  /** Strip everything paid so the awards can go out on the free plan. */
  function downgradeToFree() {
    const d = draft.value
    d.nominations = d.nominations.slice(0, FREE.maxNominations)
    d.nominations.forEach((n) => (n.nominees = n.nominees.filter((x) => x.kind !== 'media')))
    d.look = {}
  }

  /** Publishing rules are the indexing thresholds - see DESIGN of the feature. */
  const checks = computed(() => {
    const d = draft.value
    const filled = d.nominations.filter((n) => n.title.trim() && n.nominees.length)
    return [
      { id: 'name', label: 'Awards name', ok: !!d.name.trim() && d.name.length <= FREE.nameLimit },
      { id: 'description', label: 'A description', ok: d.description.trim().length >= 20 },
      {
        id: 'nominations',
        label: `At least ${PUBLISH.minNominations} nominations`,
        ok: filled.length >= PUBLISH.minNominations,
      },
      {
        id: 'nominees',
        label: `At least ${PUBLISH.minNomineesPerNomination} nominees in each`,
        ok: filled.length > 0 && filled.every((n) => n.nominees.length >= PUBLISH.minNomineesPerNomination),
      },
      { id: 'dates', label: 'Voting dates in order', ok: datesOk(d) },
    ]
  })
  const canPublish = computed(() => checks.value.every((c) => c.ok))

  /** Names containing "Streamer Awards" go out noindex - warn while it can still be changed. */
  const nameWarning = computed(() =>
    /streamer\s+awards/i.test(draft.value.name)
      ? 'Names containing "Streamer Awards" are kept out of search to avoid clashing with the show of that name.'
      : '',
  )

  function publish() {
    if (!canPublish.value) return null
    const clean: Award = JSON.parse(JSON.stringify(draft.value))
    // empty rows are scaffolding, not content: they never reach the published page
    clean.nominations = clean.nominations.filter((n) => n.title.trim() && n.nominees.length)
    clean.partners = clean.partners.filter((x) => x.name.trim())
    const award: Award = {
      ...clean,
      slug: slugify(draft.value.name),
      publishedAt: new Date().toISOString(),
    }
    published.value = [award, ...published.value.filter((a) => a.slug !== award.slug)]
    try {
      localStorage.setItem(PUBLISHED_KEY, JSON.stringify(published.value))
      localStorage.removeItem(DRAFT_KEY)
    } catch {
      /* ignore */
    }
    draft.value = emptyDraft()
    return award
  }

  /** Takes a published awards down. There was no way to undo publishing at all. */
  function unpublish(slug: string) {
    published.value = published.value.filter((a) => a.slug !== slug)
    try {
      localStorage.setItem(PUBLISHED_KEY, JSON.stringify(published.value))
      for (const key of ['awards-maker:votes', 'awards-maker:tally', 'awards-maker:ceremony']) {
        const all = JSON.parse(localStorage.getItem(key) || '{}')
        delete all[slug]
        localStorage.setItem(key, JSON.stringify(all))
      }
    } catch {
      /* nothing to write to */
    }
  }

  function reset() {
    draft.value = emptyDraft()
  }

  return {
    draft,
    published,
    nominationsUsed,
    atNominationLimit,
    paidFeatures,
    usesPaid,
    downgradeToFree,
    addNomination,
    removeNomination,
    addNominee,
    removeNominee,
    addPartner,
    removePartner,
    checks,
    canPublish,
    nameWarning,
    publish,
    unpublish,
    reset,
  }
}

function datesOk(d: Award) {
  if (!d.opensAt || !d.closesAt || !d.ceremonyAt) return false
  return d.opensAt < d.closesAt && d.closesAt <= d.ceremonyAt
}
