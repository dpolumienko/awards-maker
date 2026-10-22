<script setup lang="ts">
// The builder. Form on the left, the page being built on the right, exactly the
// split the mockup used. No backend yet: the draft lives in localStorage and the
// channel search runs on mock data, but the shape is the future API shape.
import { computed, onMounted, ref, watch } from 'vue'
import UiField from '~/components/ui/UiField.vue'
import UiTextarea from '~/components/ui/UiTextarea.vue'
import UiButton from '~/components/ui/UiButton.vue'
import BuilderTickets, { type BuilderStep } from '~/components/builder/BuilderTickets.vue'
import BuilderMissing from '~/components/builder/BuilderMissing.vue'
import NominationCard from '~/components/ui/NominationCard.vue'
import TemplatePicker from '~/components/ui/TemplatePicker.vue'
import PaywallNote from '~/components/ui/PaywallNote.vue'
import EnvLookSection from '~/components/envelope/EnvLookSection.vue'
import EnvBuilderPreview from '~/components/envelope/EnvBuilderPreview.vue'
import EnvFullPreview from '~/components/envelope/EnvFullPreview.vue'
import EnvCrBasics from '~/components/envelope/EnvCrBasics.vue'
import EnvCrNominations from '~/components/envelope/EnvCrNominations.vue'
import EnvCrPartners from '~/components/envelope/EnvCrPartners.vue'
import EnvCrPublish from '~/components/envelope/EnvCrPublish.vue'
import '~/assets/css/envelope-cr.css'
import InteractiveAccordion from '~/components/ui/InteractiveAccordion.vue'
import type { AwardTemplate } from '~/data/templates'
import EnvConfirm from '~/components/envelope/EnvConfirm.vue'
import { ideaGroup } from '~/data/ideas'
import { useAwardDraft } from '~/composables/useAwardDraft'
import { FIELD, FREE } from '~/types/award'
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
    goStep('cats')
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
// Envelope: the whole page in a popup, from the preview or the floating button on a phone
const fullOpen = ref(false)
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

// The form in steps. Every section stays mounted - v-show, not v-if - so nothing
// typed is lost when a step is left.

// Envelope on a phone (Ed's prototype, 2026-10-22): the hint under a field folds
// into an (i) by its label and opens as a tooltip, so the form stays short.
onMounted(() => {
  const tip = document.createElement('div')
  tip.className = 'eb-tip'
  tip.setAttribute('role', 'tooltip')
  tip.hidden = true
  document.body.appendChild(tip)
  let cur: HTMLElement | null = null
  const close = () => {
    tip.hidden = true
    cur?.setAttribute('aria-expanded', 'false')
    cur = null
  }
  const openFor = (b: HTMLElement, text: string) => {
    if (cur === b) return close()
    close()
    cur = b
    b.setAttribute('aria-expanded', 'true')
    tip.textContent = text
    tip.hidden = false
    const r = b.getBoundingClientRect(), W = Math.min(280, innerWidth - 24)
    let x = r.left + r.width / 2 - W / 2
    x = Math.max(12, Math.min(innerWidth - W - 12, x))
    tip.style.width = W + 'px'
    tip.style.left = x + 'px'
    tip.style.top = r.top + scrollY - tip.offsetHeight - 10 + 'px'
    tip.style.setProperty('--ax', r.left + r.width / 2 - x + 'px')
  }
  document.querySelectorAll<HTMLElement>('.env-builder [id$="-help"], .env-builder .elk-k small').forEach((h) => {
    let box: HTMLElement | null = h.parentElement
    const SEL = ':scope > .label, :scope > div > .label, :scope > b, :scope > legend'
    while (box && !box.querySelector(SEL)) box = box.parentElement
    const label = box?.querySelector<HTMLElement>(SEL)
    if (!label || label.querySelector('.eb-ii')) return
    h.classList.add('eb-hint')
    const b = document.createElement('button')
    b.type = 'button'
    b.className = 'eb-ii'
    b.setAttribute('aria-label', 'About this field')
    b.setAttribute('aria-expanded', 'false')
    b.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      openFor(b, h.textContent || '')
    })
    label.appendChild(b)
  })
  document.addEventListener('click', (e) => {
    if (cur && !(e.target as HTMLElement).closest('.eb-ii')) close()
  })
  addEventListener('scroll', close, { passive: true })
})
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
const NEEDS: Record<StepId, string[]> = { show: ['name', 'description'], cats: ['nominations', 'nominees', 'channels'], when: ['dates'], look: [], go: [] }
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
      paid: s.id === 'look',
    }
  })
})
const NEEDS_BY: Record<string, StepId> = { name: 'show', description: 'show', nominations: 'cats', nominees: 'cats', channels: 'cats', dates: 'when' }
async function fixFromPublish(id: string) {
  goStep(NEEDS_BY[id] ?? step.value)
  await nextTick()
  setTimeout(() => fixMissing(id), 350)
}
const stepIndex = computed(() => STEPS.findIndex((s) => s.id === step.value))
/** Shown in the current step. */
const at = (...ids: StepId[]) => ids.includes(step.value)
/** steps left at least once: coming back to one that is still short shows what it lacks */
const left = ref(new Set<StepId>())
const missingHere = computed(() =>
  left.value.has(step.value)
    ? checks.value.filter((c) => NEEDS[step.value].includes(c.id) && !c.ok).map(({ id, label }) => ({ id, label }))
    : [],
)
const isMissing = (id: string) => missingHere.value.some((m) => m.id === id)
/** from the Missing list to the field: the first input in whatever carries `data-check` */
function fixMissing(id: string) {
  const el = document.querySelector<HTMLElement>(`[data-check="${id}"]`)
  el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  ;(el?.querySelector<HTMLElement>('input, textarea, select') ?? el?.querySelector<HTMLElement>('button:not(.eb-ii)'))?.focus({ preventScroll: true })
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

/**
 * A pack replaces the categories with its own (Ed, 2026-10-22). When there is work
 * in them - nominees added, or titles that are not this pack's - it asks first,
 * because switching wipes it.
 */
const packAsk = ref<AwardTemplate | null>(null)
function applyTemplate(t: AwardTemplate) {
  // the pack already in use: nothing to switch, nothing to lose
  if (draft.value.templateId === t.id) return
  const worked = draft.value.nominations.some((n) => n.nominees.length || (n.title.trim() && !t.nominations.includes(n.title.trim())))
  if (worked) {
    packAsk.value = t
    return
  }
  usePack(t)
}
function usePack(t: AwardTemplate) {
  packAsk.value = null
  draft.value.nominations = []
  t.nominations.slice(0, FREE.maxNominations).forEach((title) => {
    addNomination()
    draft.value.nominations[draft.value.nominations.length - 1]!.title = title
  })
  if (!draft.value.name.trim()) draft.value.name = `${draft.value.host.name} Awards ${new Date().getFullYear()}`
  // Categories only: the Look is paid, so a pack never brings a theme, colour or
  // font - one click on a free-looking pack must not make the show paid.
  draft.value.templateId = t.id
  flashed.value = 'cats'
  setTimeout(() => (flashed.value = null), 1200)
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
  step.value = 'cats'
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
  // Signed out, there are two accounts to choose from: the Publish step shows the
  // pair of sign-in buttons in place of the publish button (Ed, 2026-10-22).
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
    a: 'Start from one of the three sets above or add categories yourself, put at least two nominees in each, set the dates and publish. Nominees can be any channel we track or plain text, so a clip, a mod or a running joke all work.',
  },
  {
    q: 'How many categories can I have?',
    a: `Five on the free plan, and one awards running at a time. You can rename or remove any of them before publishing.`,
  },
  {
    q: 'How many people can vote?',
    a: 'Two hundred unique voters per awards on the free plan. Voting closes when it reaches that number and every vote already cast is kept.',
  },
  {
    q: 'Can I edit the awards after publishing?',
    a: 'Names and descriptions, yes. Nominees stay put once voting is open, because changing the nominees mid-vote would invalidate the votes already cast.',
  },
  {
    q: 'When does my awards page show up in search?',
    a: `Once it has at least one category with two nominees and a description. The checklist above the publish button is exactly that rule.`,
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
  <div class="shell env-builder pb-10 pt-6">
    <div class="eb-head">
    <h1 class="heading">Create your own awards show</h1>
    <!-- Envelope: the demo is a quiet aside by the title, not a strip of its own -->
    <div v-if="demo" class="eb-demo">
      <span><b>Demo</b> A test host and a show with every feature.</span>
      <button type="button" class="eb-demo-btn" :disabled="demoBusy" @click="createDemoAward">Create demo award</button>
    </div>
    </div>
    <p class="mt-3 max-w-copy text-lg text-ink-2">
      Start from a pack or write your own categories, nominate any channel or meme, and publish a page your viewers
      vote on.
    </p>

    <!-- the steps -->
    <BuilderTickets id="builder" class="mt-6 scroll-mt-24" :steps="tickets" :current="step" @go="goStep" />

    <!-- the form is where the work is; the preview is read-only and can be narrower -->
    <div class="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
      <!-- FORM -->
      <!-- flex + gap, not space-y: the steps are v-show, and space-y counted the hidden ones, so the
           first visible block of a step got a top margin on some steps and not others (Ed: it jumped) -->
      <div class="env-cr cr cr-form flex flex-col gap-8">
        <BuilderMissing v-if="missingHere.length" :items="missingHere" @fix="fixMissing" />
        <TemplatePicker
          v-show="at('show')"
          :env="true"
          :used="nominationsUsed"
          :active="draft.templateId"
          :compact="true"
          @apply="applyTemplate"
          @add-idea="addIdea"
        />

                  <EnvCrBasics v-show="at('show')" part="show" :missing="missingHere.map((m) => m.id)" />
          <EnvCrBasics v-show="at('when')" part="when" :missing="missingHere.map((m) => m.id)" />
        

        <EnvLookSection
         
          v-show="at('look')"
          :look="draft.look"
          @update:look="draft.look = $event"
        />

        <EnvCrNominations v-show="at('cats')" />

        <EnvCrPartners v-show="at('look')" />

        <EnvCrPublish v-show="at('go')" :signed-in="signedIn" :error="publishError" @sign-in="signInAsHost" @publish="onPublish" @fix="fixFromPublish" />
        <!-- the payment goes straight to checkout from here; Stripe off answers 503 and says so -->
        <p v-if="checkoutError" class="mt-3 text-sm text-danger" role="alert">{{ checkoutError }}</p>

        <!-- the stepped builder: back and next under every step -->
        <div class="builder-steps-bar flex justify-between gap-3 border-t-2 border-ink pt-5">
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
        class="hidden lg:block lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <!-- no label over the panel: a line of micro type here pushed the preview
             three rows below the form column and the two stopped lining up. The
             panel says what it is on its own chip. -->
        <EnvBuilderPreview :award="draft" :signed-in="signedIn" @full="fullOpen = true" />
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

          <EnvFullPreview :award="draft" :open="fullOpen" @close="fullOpen = false" />
          <EnvConfirm
            :open="!!packAsk"
            :title="`Switch to ${packAsk?.name ?? 'this pack'}?`"
            text="Its categories replace yours. The categories and nominees you have set up now will be erased."
            confirm-label="Erase and switch"
            @cancel="packAsk = null"
            @confirm="packAsk && usePack(packAsk)"
          />
      <button type="button" class="eb-fab" :class="fullOpen && 'is-hidden'" @click="fullOpen = true"><i aria-hidden="true" />Preview</button>
    
  </div>

</template>
