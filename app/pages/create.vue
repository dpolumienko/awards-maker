<script setup lang="ts">
// The builder. Form on the left, the page being built on the right, exactly the
// split the mockup used. No backend yet: the draft lives in localStorage and the
// channel search runs on mock data, but the shape is the future API shape.
import { computed, onMounted, ref, watch } from 'vue'
import UiField from '~/components/ui/UiField.vue'
import UiDateTimeField from '~/components/ui/UiDateTimeField.vue'
import UiTextarea from '~/components/ui/UiTextarea.vue'
import UiButton from '~/components/ui/UiButton.vue'
import NominationCard from '~/components/ui/NominationCard.vue'
import AwardPreview from '~/components/ui/AwardPreview.vue'
import PublishPanel from '~/components/ui/PublishPanel.vue'
import TemplatePicker from '~/components/ui/TemplatePicker.vue'
import PaywallNote from '~/components/ui/PaywallNote.vue'
import LookSection from '~/components/ui/LookSection.vue'
import PlatformDot from '~/components/ui/PlatformDot.vue'
import LivePill from '~/components/ui/LivePill.vue'
import InteractiveAccordion from '~/components/ui/InteractiveAccordion.vue'
import type { AwardTemplate } from '~/data/templates'
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
const { signedIn, isHost, signInAsHost } = useAccount()
const { load: loadBilling } = usePro()
onMounted(() => {
  load()
  loadBilling()
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
}

/**
 * `/create?ideas=<group>` - the way in from the category ideas page. It fills the
 * empty rows and stops at the free ceiling; an existing draft is never overwritten.
 */
const route = useRoute()
onMounted(() => {
  const group = ideaGroup(String(route.query.ideas ?? ''))
  if (!group) return
  // the whole set, not the free slice: a set that runs past the ceiling is how the
  // page said it would behave, and the paywall note explains the rest
  group.items.slice(0, group.set).forEach(addIdea)
})

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
  if (!signedIn.value || !isHost.value) {
    signInAsHost()
    return
  }
  const award = await publish()
  if (!award) return
  const host = import.meta.client ? location.host : 'awards.streamscharts.com'
  curtain.open({ slug: award.slug, name: award.name, url: `${host}/a/${award.slug}`, look: award.look })
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
    q: 'How do I set up awards for my chat?',
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
    a: 'Once it has at least three nominations, two nominees in each and a description. The checklist above the publish button is exactly that rule.',
  },
]

useSeoMeta({
  title: 'Create Your Own Streamer Awards',
  description:
    'Start from a ready-made set of categories, nominate any Twitch, Kick or YouTube channel, and publish a page your viewers vote on. Free with a Twitch login.',
  ogImage: ogCard('create'),
})
// No structured data: the builder is noindex (a client-rendered form, not a page to rank).
</script>

<template>
  <div class="shell py-10">
    <h1 class="heading">Create your own streamer awards</h1>
    <p class="mt-3 max-w-copy text-lg text-ink-2">
      Start from a ready-made set of categories or write your own, nominate channels from Twitch, Kick and YouTube or your community's favourite meme,
      then publish a page your viewers vote on.
      Free: up to {{ FREE.maxNominations }} nominations, one awards at a time, {{ FREE.maxVoters }} voters.
    </p>

    <!-- signed out: nothing is blocked except publishing, the way the flow was designed -->
    <div
      v-if="!signedIn"
      class="mt-8 flex flex-wrap items-center gap-4 rounded-card border border-hair bg-s1 p-5"
    >
      <p class="text-sm text-ink-2">
        You can build the whole thing first. Twitch login is asked when you publish.
      </p>
      <button
        type="button"
        class="ml-auto flex h-11 items-center gap-2 rounded-btn bg-twitch px-4 text-sm font-bold uppercase tracking-button text-white transition-opacity hover:opacity-90"
        @click="signInAsHost"
      >
        Sign in with Twitch
      </button>
    </div>

    <!-- signed in: the channel the awards belong to -->
    <div v-else class="mt-8 flex flex-wrap items-center gap-3 rounded-card border border-hair bg-s1 p-4">
      <span aria-hidden="true" class="grid h-9 w-9 place-items-center rounded-pill bg-s3 text-xs font-bold text-ink-muted">
        {{ draft.host.name.slice(0, 2).toUpperCase() }}
      </span>
      <span class="font-semibold">{{ draft.host.name }}</span>
      <PlatformDot :platform="draft.host.platform" />
      <LivePill game="Just Chatting" />
      <span class="micro ml-auto">Building awards for this channel</span>
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

    <!-- the form is where the work is; the preview is read-only and can be narrower -->
    <div class="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
      <!-- FORM -->
      <div :class="tab === 'preview' && 'hidden lg:block'" class="space-y-8">
        <TemplatePicker
          :used="nominationsUsed"
          :active="draft.templateId"
          @apply="applyTemplate"
          @add-idea="addIdea"
        />

        <section class="rounded-card border border-hair bg-s1 p-6">
          <h2 class="text-xl font-semibold">The basics</h2>
          <div class="mt-5 space-y-5">
            <UiField
              v-model="draft.name"
              label="Awards name"
              placeholder="Chat Awards 2026"
              :limit="FREE.nameLimit"
              :error="nameError"
              :warning="nameWarning"
              helper="Shown as the page title and on every share image."
            />
            <UiTextarea
              v-model="draft.description"
              label="Description"
              placeholder="What these awards are for, and who votes."
              :limit="FIELD.descriptionLimit"
              helper="A description is required before publishing. Two sentences is plenty."
            />
            <!-- dates are moments in the show's zone, not whole days (review 2026-09-24) -->
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
            <div class="grid gap-4">
              <UiDateTimeField v-model="draft.opensAt" label="Voting opens" :time-zone="draft.timezone" default-time="12:00" />
              <UiDateTimeField v-model="draft.closesAt" label="Voting closes" :time-zone="draft.timezone" default-time="21:00" />
              <UiDateTimeField v-model="draft.ceremonyAt" label="Ceremony" :time-zone="draft.timezone" default-time="20:00" />
            </div>
          </div>
        </section>

        <LookSection
          :look="draft.look"
          :signed-in="signedIn"
          :channel="draft.host.name"
          @update:look="draft.look = $event"
          @sign-in="signInAsHost"
        />

        <section id="nominations">
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

        <section class="rounded-card border border-hair bg-s1 p-6">
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
              <UiConfirmButton
                class="mb-9"
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
          :checks="checks"
          :can-publish="canPublish"
          :nominations-used="nominationsUsed"
          :paid-features="paidFeatures"
          :error="publishError"
          @publish="onPublish"
          @upgrade="paywallOpen = true"
          @downgrade="onPublishFree"
        />
      </div>

      <!-- PREVIEW -->
      <!-- the preview is a panel, not a page: past three nominations it used to grow
           under the fold and the bottom of it was unreachable while the form scrolled -->
      <div
        :class="tab === 'form' && 'hidden lg:block'"
        class="lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-1"
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
