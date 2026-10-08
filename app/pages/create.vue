<script setup lang="ts">
// The builder. Form on the left, the page being built on the right, exactly the
// split the mockup used. No backend yet: the draft lives in localStorage and the
// channel search runs on mock data, but the shape is the future API shape.
import { computed, onMounted, ref, watch } from 'vue'
import UiField from '~/components/ui/UiField.vue'
import UiDateTimeField from '~/components/ui/UiDateTimeField.vue'
import UiTextarea from '~/components/ui/UiTextarea.vue'
import UiButton from '~/components/ui/UiButton.vue'
import SignInButtons from '~/components/ui/SignInButtons.vue'
import BuilderTickets, { type BuilderStep } from '~/components/zine/BuilderTickets.vue'
import BuilderMissing from '~/components/zine/BuilderMissing.vue'
import { useVersion } from '~/composables/useVersion'
import NominationCard from '~/components/ui/NominationCard.vue'
import AwardPreview from '~/components/ui/AwardPreview.vue'
import PublishPanel from '~/components/ui/PublishPanel.vue'
import TemplatePicker from '~/components/ui/TemplatePicker.vue'
import PaywallNote from '~/components/ui/PaywallNote.vue'
import LookSection from '~/components/ui/LookSection.vue'
import InteractiveAccordion from '~/components/ui/InteractiveAccordion.vue'
import type { AwardTemplate } from '~/data/templates'
import { ideaGroup } from '~/data/ideas'
import { useAwardDraft } from '~/composables/useAwardDraft'
import { FIELD, FREE } from '~/types/award'
import { INDEX } from '#shared/indexable'
import { allTimeZones, utcToZoned, zoneCity, zoneOffset, zonedToUtc } from '#shared/time'
import { DISPLAY_FONTS, useDisplayFonts } from '~/composables/useDisplayFonts'

const {
  draft,
  nominationsUsed,
  atNominationLimit,
  addNomination,
  removeNomination,
  addNominee,
  removeNominee,
  addPartner,
  removePartner,
  checks,
  canPublish,
  nameWarning,
  paidFeatures,
  usesPaid,
  downgradeToFree,
  publish,
  publishError,
  load,
  saving,
} = useAwardDraft()
// the Look section offers every headline face, and the preview draws the chosen one
useDisplayFonts(DISPLAY_FONTS)

// Demo build only (app/demo/): signs in as a demo host and fills a show with
// every feature, so the full flow can be clicked through without a server.
const demo = !!useRuntimeConfig().public.demo
const demoBusy = ref(false)
async function createDemoAward() {
  demoBusy.value = true
  try {
    const [{ demoSignIn, DEMO_USER }, { demoAward }] = await Promise.all([import('~/demo/api'), import('~/demo/sample')])
    demoSignIn()
    await useUserSession().fetch()
    draft.value = demoAward(DEMO_USER.name)
    await nextTick()
    // v2 shows the filled categories step; elsewhere the page stays put - jumping
    // 2 500 px down to the nominations read as a broken anchor (review 2026-10-08)
    if (isV2.value) goStep('cats')
  } finally {
    demoBusy.value = false
  }
}

// Most useful first, then everything; the label carries today's offset.
const zones = computed(() => {
  const list = allTimeZones()
  if (draft.value.timezone && !list.includes(draft.value.timezone)) list.unshift(draft.value.timezone)
  return list.map((id) => ({ id, label: `${zoneCity(id)} (${zoneOffset(id)})${id.includes('/') ? ` - ${id}` : ''}` }))
})

// A host who picks another zone means "21:00 there", not "the same instant":
// the clock times stay, the instants move with the zone.
// A draft arriving from the server changes the zone too, with its own dates -
// that is not a host changing their mind, so only a change within the same
// draft object moves anything.
watch(
  () => ({ d: draft.value, tz: draft.value.timezone }),
  (next, prev) => {
    const [to, from] = [next.tz, prev.tz]
    if (next.d !== prev.d || !from || !to || to === from) return
    for (const key of ['opensAt', 'closesAt', 'ceremonyAt'] as const) {
      const at = draft.value[key]
      if (!at) continue
      const { date, time } = utcToZoned(at, from)
      draft.value[key] = zonedToUtc(date, time, to)
    }
  },
)

// A draft belongs to an account now, so the builder loads it once there is one.
const { signedIn, isHost, channel, signInAsHost } = useAccount()
const { load: loadBilling, checkout, checkoutError } = usePro()
onMounted(async () => {
  loadBilling()
  // the draft first, then anything the URL asks to add to it - the two used to
  // race, and the async load wiped the ideas that had just been put in (QA P1)
  await load()
  applyIdeasFromQuery()
})
const tab = ref<'form' | 'preview'>('form')
const cards = ref<InstanceType<typeof NominationCard>[]>([])
const paywallOpen = ref(false)

const nameError = computed(() =>
  draft.value.name.length > FREE.nameLimit ? `Keep it under ${FREE.nameLimit} characters so the page title fits.` : '',
)

async function onAddNomination() {
  // never blocked: past the free limit the new nomination is simply marked paid
  addNomination()
  paywallOpen.value = draft.value.nominations.length > FREE.maxNominations
  await nextTick()
  cards.value[cards.value.length - 1]?.focusTitle()
}

// Night v2: the same form, one ticket at a time (components/zine/BuilderTickets).
// Every section stays mounted - v-show, not v-if - so nothing typed is lost when
// a step is left, and the other versions keep the single long page.
const { isV2 } = useVersion()
const STEPS = [
  { id: 'show', title: 'Setup', sub: 'Name and a pack' },
  { id: 'cats', title: 'Categories', sub: 'And who is nominated' },
  { id: 'when', title: 'Schedule', sub: 'Voting and the ceremony' },
  { id: 'look', title: 'Customize', sub: 'Style and partners' },
  { id: 'go', title: 'Publish', sub: 'Check and go live' },
] as const
type StepId = (typeof STEPS)[number]['id']
const step = ref<StepId>('show')
const visited = ref(new Set<StepId>(['show']))
// what each ticket needs from the publish checks; Look and Publish need nothing
// of their own (Publish lists every check itself)
const NEEDS: Record<StepId, string[]> = { show: ['name', 'description'], cats: ['nominations', 'nominees'], when: ['dates'], look: [], go: [] }
/** a ticket that just got something from another step - a pack picked on the first */
const flashed = ref<StepId | null>(null)
const tickets = computed(() => {
  const titled = draft.value.nominations.filter((n) => n.title.trim()).length
  return STEPS.map((s) => {
    const short = checks.value.filter((c) => NEEDS[s.id].includes(c.id) && !c.ok).map((c) => c.label)
    const left = visited.value.has(s.id) && step.value !== s.id
    const state: BuilderStep['state'] =
      s.id === 'go' ? 'todo'
      : short.length ? (left ? 'missing' : 'todo')
      : NEEDS[s.id].length && s.id !== 'when' ? 'done'
      : left ? 'done' : 'todo'
    return {
      ...s,
      sub: s.id === 'cats' && titled ? `${titled} added, ${s.sub.toLowerCase()}` : s.sub,
      state,
      missing: short.join(', '),
      flash: flashed.value === s.id,
    }
  })
})
const stepIndex = computed(() => STEPS.findIndex((s) => s.id === step.value))
/** Shown in this version's current step - always true outside v2. */
const at = (...ids: StepId[]) => !isV2.value || ids.includes(step.value)
/** steps left at least once: coming back to one that is still short shows what it lacks */
const left = ref(new Set<StepId>())
const missingHere = computed(() =>
  isV2.value && left.value.has(step.value)
    ? checks.value.filter((c) => NEEDS[step.value].includes(c.id) && !c.ok).map(({ id, label }) => ({ id, label }))
    : [],
)
const isMissing = (id: string) => missingHere.value.some((m) => m.id === id)
/** from the Missing list to the field: the first input in whatever carries `data-check` */
function fixMissing(id: string) {
  const el = document.querySelector<HTMLElement>(`[data-check="${id}"]`)
  el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  el?.querySelector<HTMLElement>('input, textarea, select, button')?.focus({ preventScroll: true })
}
function goStep(id: string) {
  if (id !== step.value) left.value.add(step.value)
  step.value = id as StepId
  visited.value.add(id as StepId)
  if (import.meta.client) document.getElementById('builder')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

/** Free publish: strip the paid bits first, then go. */
async function onPublishFree() {
  downgradeToFree()
  await onPublish()
}

/** A template fills the empty rows first, then appends up to the Free limit. */
function applyTemplate(t: AwardTemplate) {
  const titles = t.nominations.slice(0, FREE.maxNominations)
  draft.value.nominations = draft.value.nominations.filter((n) => n.title.trim() || n.nominees.length)
  titles.forEach((title) => {
    const empty = draft.value.nominations.find((n) => !n.title.trim() && !n.nominees.length)
    if (empty) empty.title = title
    else if (draft.value.nominations.length < FREE.maxNominations) {
      addNomination()
      draft.value.nominations[draft.value.nominations.length - 1]!.title = title
    }
  })
  if (!draft.value.name.trim()) draft.value.name = `${draft.value.host.name} Awards ${new Date().getFullYear()}`
  // A set is a starting point for the whole page, not only the category list, so
  // it brings its own theme, colour and face - switching sets visibly changes the
  // preview. An uploaded cover is the streamer's own asset and survives.
  // Categories only. A preset used to bring its own theme, colour and font too,
  // and the Look is paid - so one click on a free-looking preset made the whole
  // show paid (review 2026-09-24: "paid things scare people off at once").
  draft.value.templateId = t.id
  if (isV2.value) {
    flashed.value = 'cats'
    setTimeout(() => (flashed.value = null), 1200)
  }
}

/**
 * `/create?ideas=<group>` - the way in from the category ideas page. It fills the
 * empty rows and stops at the free ceiling; an existing draft is never overwritten.
 */
const route = useRoute()
function applyIdeasFromQuery() {
  const group = ideaGroup(String(route.query.ideas ?? ''))
  if (!group) return
  // the whole set, not the free slice: a set that runs past the ceiling is how the
  // page said it would behave, and the paywall note explains the rest
  group.items.slice(0, group.set).forEach(addIdea)
  if (isV2.value) step.value = 'cats'
  // once applied, drop it from the URL so a reload does not add the set twice
  navigateTo({ query: { ...route.query, ideas: undefined } }, { replace: true })
}

function addIdea(title: string) {
  const empty = draft.value.nominations.find((n) => !n.title.trim() && !n.nominees.length)
  if (empty) {
    empty.title = title
    return
  }
  addNomination()
  draft.value.nominations[draft.value.nominations.length - 1]!.title = title
  paywallOpen.value = draft.value.nominations.length > FREE.maxNominations
}

// Publishing is the one moment in the builder worth marking. The curtain itself
// lives in app.vue so it outlives this page - see usePublishCurtain.
// publish() empties the draft, so the curtain is handed the published award's own
// look - reading draft.look here would paint a blank stage.
const curtain = usePublishCurtain()
async function onPublish() {
  // Running a show needs the channel scopes, which the voter sign-in does not
  // grant. Sending them through the wider consent here beats a 403 after they
  // have filled in the whole form.
  // Signed out, there are two accounts to choose from, so the page takes them to
  // the pair of sign-in buttons instead of picking Twitch for them.
  if (!signedIn.value) {
    const box = document.getElementById('host-signin')
    box?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    box?.querySelector('button')?.focus({ preventScroll: true })
    return
  }
  if (!isHost.value) {
    signInAsHost(channel.value.platform === 'kick' ? 'kick' : 'twitch')
    return
  }
  const award = await publish()
  if (!award) return
  const host = import.meta.client ? location.host : 'awards.streamscharts.com'
  curtain.open({ slug: award.slug, name: award.name, url: `${host}${asset(`/a/${award.slug}`)}`, look: award.look })
}

// The builder is a tool page, like the other tools that rank: the tool sits on
// top, the reading matter underneath. Intent here is "make / set up", while the
// landing owns the broader "what is this" - that is what keeps them apart.
const faq = [
  {
    q: 'Do you have ready-made award categories?',
    a: 'Yes - three sets of five. One follows the categories the big streaming award shows run (Streamer of the Year, Rising Star, Best Variety Streamer and so on), the other two are built for a single channel and its chat. One click fills the form, and single ideas - genre awards, collabs, marathons - can be added one at a time. Rename or drop anything after.',
  },
  {
    q: 'How do I set up awards for my viewers?',
    a: 'Start from one of the three sets above or add nominations yourself, put at least two nominees in each, set the dates and publish. Nominees can be any channel we track or plain text, so a clip, a mod or a running joke all work.',
  },
  {
    q: 'How many nominations can I have?',
    a: `Five on the free plan, and one awards running at a time. You can rename or remove any of them before publishing.`,
  },
  {
    q: 'How many people can vote?',
    a: 'Two hundred unique voters per awards on the free plan. Voting closes when it reaches that number and every vote already cast is kept.',
  },
  {
    q: 'Can I edit the awards after publishing?',
    a: 'Names and descriptions, yes. Nominees stay put once voting is open, because changing the ballot mid-vote would invalidate the votes already cast.',
  },
  {
    q: 'When does my awards page show up in search?',
    a: `Once it has at least three nominations, two nominees in each and a description of ${INDEX.minDescription}+ characters. The checklist above the publish button is exactly that rule.`,
  },
]

useSeoMeta({
  title: 'Create Your Own Awards Show',
  description:
    'Start from a ready-made set of categories, nominate any Twitch, Kick or YouTube channel, and publish a page your viewers vote on. Free with a Twitch or Kick login.',
  ogImage: ogCard('create'),
})
// No structured data: the builder is noindex (a client-rendered form, not a page to rank).
</script>

<template>
  <div class="shell" :class="isV2 ? 'pb-10 pt-6' : 'py-10'">
    <h1 class="heading">Create your own awards show</h1>
    <!-- Night v2 keeps the first step on one screen: no lead, the two strips side by side -->
    <p v-if="!isV2" class="mt-3 max-w-copy text-lg text-ink-2">
      Start from a pack or write your own categories, nominate any channel or meme, and publish a page your viewers
      vote on.
    </p>

    <div :class="isV2 && ['mt-6 grid gap-3', !signedIn && 'lg:grid-cols-2']">
      <!-- demo build only: skip Twitch and fill everything in -->
      <div
        v-if="demo"
        class="flex flex-wrap items-center gap-4 rounded-card border border-dashed border-gold-24 bg-gold/[0.06]"
        :class="isV2 ? 'p-3' : 'mt-8 p-5'"
      >
        <p v-if="isV2" class="min-w-0 flex-1 text-sm text-ink-2"><b class="text-ink">Demo.</b> A test host and a show with every feature.</p>
        <p v-else class="min-w-0 flex-1 text-sm text-ink-2">
          <b class="text-ink">Demo.</b> Signs you in as a test host and fills a show with every feature:
          channels, images, clips, cover, partners, dates. Then publish, vote, close and run the ceremony.
        </p>
        <UiButton class="ml-auto" :disabled="demoBusy" @click="createDemoAward">Create demo award</UiButton>
      </div>

      <!-- signed out: nothing is blocked except publishing, the way the flow was designed -->
      <div
        v-if="!signedIn"
        id="host-signin"
        class="flex flex-wrap items-center gap-4 rounded-card border border-hair bg-s1"
        :class="isV2 ? 'p-3' : 'mt-8 p-5'"
      >
        <p class="min-w-0 flex-1 text-sm text-ink-2">
          {{ isV2 ? 'Login is asked when you publish.' : 'You can build the whole thing first. A Twitch or Kick login is asked when you publish.' }}
        </p>
        <SignInButtons class="ml-auto" @choose="signInAsHost" />
      </div>
    </div>

    <!-- mobile switch between the form and the preview -->
    <div class="mt-8 flex gap-2 lg:hidden" role="tablist" aria-label="Builder view">
      <button
        v-for="t in (['form', 'preview'] as const)"
        :key="t"
        type="button"
        role="tab"
        :aria-selected="tab === t"
        class="h-11 flex-1 rounded-btn border text-sm font-bold uppercase tracking-button transition-colors"
        :class="tab === t ? 'border-gold bg-gold/[0.12] text-gold-text' : 'border-hair text-ink-muted'"
        @click="tab = t"
      >
        {{ t }}
      </button>
    </div>

    <!-- Night v2: the steps, as tickets -->
    <BuilderTickets v-if="isV2" id="builder" class="mt-6 scroll-mt-24" :steps="tickets" :current="step" @go="goStep" />

    <!-- the form is where the work is; the preview is read-only and can be narrower -->
    <div class="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
      <!-- FORM -->
      <div :class="tab === 'preview' && 'hidden lg:block'" class="space-y-8">
        <BuilderMissing v-if="missingHere.length" :items="missingHere" @fix="fixMissing" />
        <TemplatePicker
          v-show="at('show')"
          :used="nominationsUsed"
          :active="draft.templateId"
          :compact="isV2"
          @apply="applyTemplate"
          @add-idea="addIdea"
        />

        <section v-show="at('show', 'when')" class="rounded-card border border-hair bg-s1 p-6">
          <!-- in Night v2 the ticket above already names the step -->
          <h2 v-if="!isV2" class="text-xl font-semibold">The basics</h2>
          <div class="space-y-5" :class="!isV2 && 'mt-5'">
            <UiField
              v-show="at('show')"
              v-model="draft.name"
              label="Awards name"
              placeholder="Chat Awards 2026"
              :limit="FREE.nameLimit"
              :error="nameError || (isMissing('name') ? 'Give the awards a name.' : '')"
              data-check="name"
              :warning="nameWarning"
              helper="Shown as the page title and on every share image."
            />
            <UiTextarea
              v-show="at('show')"
              v-model="draft.description"
              label="Description"
              placeholder="What these awards are for, and who votes."
              :limit="FIELD.descriptionLimit"
              :rows="isV2 ? 2 : 4"
              :error="isMissing('description') ? 'Needs a few more words: what the awards are for and who votes.' : ''"
              data-check="description"
              helper="A description is required before publishing. Two sentences is plenty."
            />
            <!-- dates are moments in the show's zone, not whole days (review 2026-09-24) -->
            <div v-show="at('when')" class="space-y-5">
            <div>
              <label for="show-zone" class="label mb-2 block">Time zone</label>
              <select
                id="show-zone"
                v-model="draft.timezone"
                class="h-12 w-full rounded-btn border border-hair2 bg-s2 px-4 text-base text-ink transition-colors hover:border-ink-muted focus:border-gold focus:shadow-focus focus:outline-none"
                aria-describedby="show-zone-help"
              >
                <option v-for="z in zones" :key="z.id" :value="z.id">{{ z.label }}</option>
              </select>
              <p id="show-zone-help" class="mt-2 text-sm text-ink-muted">
                Every date on the page is shown in this zone, and says so.
              </p>
            </div>
            <!-- one per row: a date and a time side by side do not fit two to a row
                 in the form column, and the browser clipped them to "mm/dd/y" -->
            <div class="grid gap-4" data-check="dates">
              <p v-if="isMissing('dates')" class="text-sm font-semibold text-danger">Voting has to open before it closes, and the ceremony comes after.</p>
              <UiDateTimeField v-model="draft.opensAt" label="Voting opens" :time-zone="draft.timezone" default-time="12:00" />
              <UiDateTimeField v-model="draft.closesAt" label="Voting closes" :time-zone="draft.timezone" default-time="21:00" />
              <UiDateTimeField v-model="draft.ceremonyAt" label="Ceremony" :time-zone="draft.timezone" default-time="20:00" />
            </div>
            </div>
          </div>
        </section>

        <LookSection
          v-show="at('look')"
          :look="draft.look"
          @update:look="draft.look = $event"
        />

        <section v-show="at('cats')" id="nominations" data-check="nominations">
          <span data-check="nominees" class="sr-only" />
          <div class="flex items-end justify-between gap-4">
            <h2 class="text-xl font-semibold">Nominations</h2>
            <!-- past the free five this is a paid feature in use, not an error:
                 the count says what is free and what is paid, in those words -->
            <span class="flex items-center gap-2 text-sm">
              <span class="tnum text-ink-muted">{{ nominationsUsed }} {{ nominationsUsed === 1 ? 'nomination' : 'nominations' }}</span>
              <span
                v-if="nominationsUsed > FREE.maxNominations"
                class="rounded-pill border border-gold-24 px-2 py-0.5 text-[11px] font-bold uppercase tracking-micro text-gold-text"
              >
                {{ nominationsUsed - FREE.maxNominations }} paid
              </span>
              <span v-else class="tnum text-ink-muted">of {{ FREE.maxNominations }} free</span>
            </span>
          </div>

          <div class="mt-5 space-y-4">
            <NominationCard
              v-for="(n, i) in draft.nominations"
              :key="n.id"
              ref="cards"
              :nomination="n"
              :index="i"
              :over-free-limit="i >= FREE.maxNominations"
              @update:title="n.title = $event"
              @remove="removeNomination(n.id)"
              @add-channel="addNominee(n.id, { kind: 'channel', channel: $event })"
              @add-text="addNominee(n.id, { kind: 'text', text: $event })"
              @add-media="addNominee(n.id, { kind: 'media', text: $event.text, url: $event.url, image: $event.image })"
              @remove-nominee="removeNominee(n.id, $event)"
            />
          </div>

          <div class="mt-4">
            <UiButton variant="ghost" @click="onAddNomination">Add nomination</UiButton>
          </div>

          <!-- the 6th nomination is where the paid version starts -->
          <div v-if="paywallOpen" class="mt-4">
            <PaywallNote @dismiss="paywallOpen = false" />
          </div>
        </section>

        <section v-show="at('look')" class="rounded-card border border-hair bg-s1 p-6">
          <div class="flex items-end justify-between gap-4">
            <h2 class="text-xl font-semibold">Partners</h2>
            <span class="text-sm text-ink-muted">Optional</span>
          </div>
          <p class="mt-1 text-sm text-ink-2">Anyone backing the show. Links are checked before they go live.</p>

          <div v-if="draft.partners.length" class="mt-5 space-y-3">
            <div v-for="p in draft.partners" :key="p.id" class="flex flex-wrap items-end gap-3">
              <div class="min-w-[160px] flex-1">
                <UiField v-model="p.name" label="Name" placeholder="Loot Energy" />
              </div>
              <div class="min-w-[200px] flex-[2]">
                <UiField v-model="p.url" label="Link" placeholder="https://" />
              </div>
              <!-- as tall as the inputs it sits beside, bottom edges lined up -->
              <UiConfirmButton
                class="!h-12"
                :aria-label="'Remove partner ' + (p.name || 'row')"
                :confirm-aria-label="'Confirm removing partner ' + (p.name || 'row')"
                @confirm="removePartner(p.id)"
              />
            </div>
          </div>

          <div class="mt-4">
            <UiButton variant="ghost" size="sm" @click="addPartner">Add partner</UiButton>
          </div>
        </section>

        <PublishPanel
          v-show="at('go')"
          :checks="checks"
          :can-publish="canPublish"
          :nominations-used="nominationsUsed"
          :paid-features="paidFeatures"
          :error="publishError"
          @publish="onPublish"
          @upgrade="checkout"
          @downgrade="onPublishFree"
        />
        <!-- the payment goes straight to checkout from here; Stripe off answers 503 and says so -->
        <p v-if="checkoutError" class="mt-3 text-sm text-danger" role="alert">{{ checkoutError }}</p>

        <!-- Night v2: back and next under every step -->
        <div v-if="isV2" class="flex justify-between gap-3 border-t-2 border-ink pt-5">
          <UiButton v-if="stepIndex > 0" variant="ghost" @click="goStep(STEPS[stepIndex - 1]!.id)">Back</UiButton>
          <span v-else />
          <UiButton v-if="stepIndex < STEPS.length - 1" @click="goStep(STEPS[stepIndex + 1]!.id)">Next: {{ STEPS[stepIndex + 1]!.title }}</UiButton>
        </div>
      </div>

      <!-- PREVIEW -->
      <!-- the preview is a panel, not a page: past three nominations it used to grow
           under the fold and the bottom of it was unreachable while the form scrolled.
           It still scrolls, but shows no scrollbar (review 2026-10-06). -->
      <div
        :class="tab === 'form' && 'hidden lg:block'"
        class="lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <!-- no label over the panel: a line of micro type here pushed the preview
             three rows below the form column and the two stopped lining up. The
             panel says what it is on its own chip. -->
        <AwardPreview :award="draft" :signed-in="signedIn" />
      </div>
    </div>

    <!-- reading matter under the tool, the way the other tool pages are built -->
    <section class="mt-16 border-t border-hair pt-12">
      <h2 class="heading">Questions about setting up awards</h2>
      <div class="mt-6 border-t border-hair">
        <InteractiveAccordion :items="faq" />
      </div>
      <p class="mt-6 max-w-copy text-sm text-ink-2">
        Running something bigger - a brand show, an agency event? We can set it up and run it with you:
        <a href="mailto:sales@streamscharts.com" class="text-gold-text underline underline-offset-4">sales@streamscharts.com</a>.
      </p>
      <p class="mt-3 max-w-copy text-sm text-ink-2">
        New to this? The
        <NuxtLink to="/" class="text-gold-text underline underline-offset-4">Awards Maker overview</NuxtLink>
        explains how voting works, what a published page looks like and what other streamers are running right now.
      </p>
    </section>
  </div>

</template>
