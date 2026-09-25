import { uploadInlineImages } from '~/utils/image'
import { computed, ref, watch } from 'vue'
import { FREE, PUBLISH, type Award, type Nomination, type Nominee, type Partner } from '~/types/award'
import { canonicalZone, localTimeZone } from '#shared/time'

// The draft a host is building. It is still edited locally and reactively - a
// builder that awaited the network on every keystroke would feel broken - but it
// is loaded from and saved to the account rather than to this browser. What
// changed with the backend:
//
//   * hydration is GET /api/draft, so the same draft follows a host to a second
//     machine instead of being stranded in one browser's localStorage;
//   * saving is a debounced PUT rather than a write per keystroke;
//   * publish() is a POST and is the only place the rules are actually enforced.

const uid = () => Math.random().toString(36).slice(2, 9)

const emptyNomination = (): Nomination => ({ id: uid(), title: '', nominees: [] })

const emptyDraft = (): Award => ({
  slug: '',
  name: '',
  description: '',
  opensAt: '',
  closesAt: '',
  ceremonyAt: '',
  // the host's own zone until they pick another
  timezone: localTimeZone(),
  nominations: [emptyNomination()],
  partners: [],
  look: {},
  host: { name: '', platform: 'twitch' },
})

const draft = ref<Award>(emptyDraft())
const loaded = ref(false)
const saving = ref(false)
let watching = false

// A host may build the whole show before signing in - the builder invites it.
// Until there is an account to save to, the draft lives in this browser, and it
// is handed to the account on sign-in (QA P0: signing in to publish used to
// come back to an empty form and lose everything).
const LOCAL_KEY = 'am-draft-local'
function readLocal(): Partial<Award> | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    return raw ? (JSON.parse(raw) as Partial<Award>) : null
  } catch {
    return null
  }
}
function writeLocal(a: Award) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(a))
  } catch {
    /* private mode or full: the draft lives for this page only */
  }
}
function clearLocal() {
  try {
    localStorage.removeItem(LOCAL_KEY)
  } catch {
    /* nothing to clear */
  }
}
/** Whether a draft has anything in it a person typed. */
const hasContent = (a: Partial<Award> | null | undefined) =>
  !!a &&
  (!!a.name?.trim() ||
    !!a.description?.trim() ||
    !!a.nominations?.some((n) => n.title?.trim() || n.nominees?.length))

/**
 * Fills in anything the server left out, so a draft saved before a field existed
 * cannot crash the builder on read.
 */
function normalize(a: Partial<Award> | undefined): Award {
  const base = emptyDraft()
  if (!a) return base
  return {
    ...base,
    ...a,
    host: { ...base.host, ...(a.host ?? {}) },
    look: { ...base.look, ...(a.look ?? {}) },
    // A fresh draft row carries the column default, UTC. Until the host has set
    // a date it is not a choice anybody made, so the browser's own zone wins.
    timezone:
      a.timezone && !(a.timezone === 'UTC' && !a.opensAt && !a.closesAt && !a.ceremonyAt)
        ? canonicalZone(a.timezone)
        : base.timezone,
    partners: Array.isArray(a.partners) ? a.partners : [],
    nominations:
      Array.isArray(a.nominations) && a.nominations.length
        ? a.nominations.map((n) => ({
            ...emptyNomination(),
            ...n,
            nominees: Array.isArray(n?.nominees) ? n.nominees : [],
          }))
        : [emptyNomination()],
  }
}

/** What the API takes: the same thing without the client-side ids. */
function toPayload(a: Award) {
  return {
    name: a.name,
    description: a.description,
    templateId: a.templateId ?? null,
    opensAt: a.opensAt || null,
    closesAt: a.closesAt || null,
    ceremonyAt: a.ceremonyAt || null,
    timezone: a.timezone || localTimeZone(),
    look: a.look ?? {},
    host: a.host,
    partners: a.partners.filter((p) => p.name.trim() || p.url.trim()).map((p) => ({ name: p.name, url: p.url })),
    nominations: a.nominations.map((n) => ({
      title: n.title,
      nominees: n.nominees.map((x) =>
        x.kind === 'channel'
          ? { kind: 'channel' as const, channel: { name: x.channel.name, platform: x.channel.platform, followers: x.channel.followers } }
          : x.kind === 'media'
            ? { kind: 'media' as const, text: x.text, url: x.url, image: x.image }
            : { kind: 'text' as const, text: x.text },
      ),
    })),
  }
}

export function useAwardDraft() {
  const { signedIn, channel } = useAccount()

  /**
   * Pulls the account's draft, or this browser's when signed out. Idempotent -
   * the builder calls it on mount and awaits it before touching the form.
   */
  async function load() {
    if (loaded.value || !import.meta.client) return
    loaded.value = true
    const local = readLocal()
    if (!signedIn.value) {
      if (hasContent(local)) draft.value = normalize(local!)
      startAutosave()
      return
    }
    try {
      const res = await $fetch<{ draft: Partial<Award> }>('/api/draft')
      // the account's draft wins when it has anything in it; otherwise what was
      // built here before signing in becomes the account's draft
      if (!hasContent(res.draft) && hasContent(local)) {
        // pictures added before sign-in are data URLs; they go up first
        draft.value = normalize(await uploadInlineImages(local! as Parameters<typeof uploadInlineImages>[0]) as Partial<Award>)
        await $fetch('/api/draft', { method: 'PUT', body: toPayload(draft.value) }).catch(() => {})
      } else {
        draft.value = normalize(res.draft)
      }
      clearLocal()
      if (!draft.value.host.name) draft.value.host = { ...channel.value }
    } catch {
      draft.value = hasContent(local) ? normalize(local!) : emptyDraft()
    }
    startAutosave()
  }

  /**
   * Autosave, debounced. The prototype wrote to localStorage on every keystroke,
   * which is free; the same watcher against an API is one request per character.
   */
  function startAutosave() {
    if (watching || !import.meta.client) return
    watching = true
    let timer: ReturnType<typeof setTimeout> | undefined
    watch(
      draft,
      () => {
        clearTimeout(timer)
        if (!signedIn.value) {
          // no account yet: keep it in this browser (see LOCAL_KEY)
          timer = setTimeout(() => writeLocal(draft.value), 400)
          return
        }
        timer = setTimeout(async () => {
          saving.value = true
          try {
            await $fetch('/api/draft', { method: 'PUT', body: toPayload(draft.value) })
          } catch {
            // a failed autosave is not worth an alert: the next keystroke retries
          } finally {
            saving.value = false
          }
        }, 900)
      },
      { deep: true },
    )
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

  /** Publishing rules are the indexing thresholds - same numbers on purpose. */
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

  const publishError = ref('')

  /**
   * Hands the draft to the server, which decides the tier and the slug. Returns
   * the published show, or null with `publishError` set - a 402 here is the
   * paywall and a 403 means this session never granted the channel scopes.
   */
  async function publish(): Promise<Award | null> {
    publishError.value = ''
    if (!canPublish.value) return null
    try {
      const res = await $fetch<{ award: Award }>('/api/draft/publish', {
        method: 'POST',
        body: toPayload(draft.value),
      })
      draft.value = emptyDraft()
      loaded.value = false
      return res.award
    } catch (error) {
      publishError.value =
        (error as { statusMessage?: string }).statusMessage || 'Could not publish - try again'
      return null
    }
  }

  /** Takes a published show down, with its ballots. */
  async function unpublish(slug: string) {
    await $fetch(`/api/awards/${encodeURIComponent(slug)}`, { method: 'DELETE' })
  }

  function reset() {
    draft.value = emptyDraft()
  }

  return {
    draft,
    load,
    saving,
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
    publishError,
    unpublish,
    reset,
  }
}

function datesOk(d: Award) {
  if (!d.opensAt || !d.closesAt || !d.ceremonyAt) return false
  const [o, c, w] = [d.opensAt, d.closesAt, d.ceremonyAt].map(Date.parse)
  return o! < c! && c! <= w!
}
