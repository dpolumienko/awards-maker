<script setup lang="ts">
// The ceremony itself: a slideshow the host clicks through live on stream, one
// category at a time. The point is what it does NOT show - a dashboard on screen
// gives away every result at once, which is the failure the journey map flagged
// for this step (docs-auto/knowledge, "Ceremony").
//
// Model comes from the Reveal screen in mockup v2 (outputs/awards-builder-mockup.html):
// a 16:9 stage in the award's own look, award name as the kicker, the category as
// the headline, the nominees dimmed, "And the winner is..." and then one of them
// lit up. Two beats per category, so the pause is the host's to hold.
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import UiButton from '~/components/ui/UiButton.vue'
import UiIcon from '~/components/ui/UiIcon.vue'
import { useAwardDraft } from '~/composables/useAwardDraft'
import { useVoting } from '~/composables/useVoting'
import { prefersReducedMotion, useGsap } from '~/composables/useReveal'
import { nomineeInitials, nomineeName } from '~/utils/nominee'
import CeremonySetup from '~/components/ui/CeremonySetup.vue'
import { COVER, useCeremony } from '~/composables/useCeremony'
import { themeCss } from '~/data/themes'
import { accentText } from '~/utils/accent'

const route = useRoute()
const slug = computed(() => String(route.params.slug))
const { published } = useAwardDraft()
const { phaseOf, resultsOf, votesInOf, votersFor, publishResults } = useVoting()

const award = computed(() => published.value.find((a) => a.slug === slug.value) ?? null)
const accent = computed(() => award.value?.look?.accent || '#D9A441')
const ink = computed(() => accentText(accent.value))
// The ceremony has its own stage, face and reveal - set once, kept per awards.
const { settings, update, configured } = useCeremony(() => slug.value, () => award.value)
const setupOpen = ref(false)
/** Starting the show is a decision too: it saves the settings, so the setup does
 *  not greet the host again every time they open the ceremony. */
function onStart() {
  update({})
  setupOpen.value = false
  step.value = 0
}
const headlineFont = computed(() => `'${settings.value.font}', Archivo, sans-serif`)

/** A nominee plate: everyone in the house colour, the winner filled and lit. */
const plate = (won: boolean) =>
  won
    ? { background: accent.value, color: '#000', boxShadow: `0 0 0 0.5cqw ${accent.value}33, 0 0 7cqw ${accent.value}55` }
    : { background: 'rgba(255,255,255,.07)', color: ink.value, border: `1px solid ${accent.value}55` }

/** OBS loads this page with ?bare=1: no controls, no chrome, just the stage. */
const bare = computed(() => 'bare' in route.query)

// A category with no nominees has nothing to announce, so it is not a slide.
const categories = computed(() =>
  (award.value?.nominations ?? [])
    .filter((n) => n.nominees.length)
    .map((nomination) => {
      const rows = resultsOf(slug.value, nomination)
      const lead = rows[0]?.votes ?? 0
      const tied = rows.filter((r) => r.votes === lead && r.votes > 0)
      return {
        nomination,
        rows,
        votes: votesInOf(slug.value, nomination),
        winners: lead > 0 ? tied : [],
        tied: tied.length > 1,
      }
    }),
)

/**
 * Three ways to put a category on screen, rotating. Ten categories in the same
 * arrangement is a spreadsheet read out loud; alternating gives the show a rhythm
 * and keeps the eye moving where the next name will appear.
 *
 * `row` - plates across the middle, the classic.
 * `list` - numbered lines, left aligned: reads best with long nominee names.
 * `duel` - two big plates facing each other, for a category with two nominees.
 */
type Layout = 'row' | 'list' | 'duel'
function layoutFor(index: number, count: number): Layout {
  if (count === 2) return 'duel'
  if (count > 4) return 'list'
  return index % 2 === 0 ? 'row' : 'list'
}

/**
 * Slides: a title card, two beats per category, and a closing card. Beats are
 * their own step so the reveal lands when the host clicks, not when the slide does.
 */
type Slide =
  | { kind: 'title' }
  | { kind: 'category'; index: number; shown: boolean }
  | { kind: 'end' }

const slides = computed<Slide[]>(() => [
  { kind: 'title' },
  ...categories.value.flatMap((_, index) => [
    { kind: 'category' as const, index, shown: false },
    { kind: 'category' as const, index, shown: true },
  ]),
  { kind: 'end' },
])

/** How far through the evening we are, drawn as a hairline under the stage. */
const step = ref(0)
const slide = computed(() => slides.value[Math.min(step.value, slides.value.length - 1)]!)
const current = computed(() => {
  if (slide.value.kind !== 'category') return null
  const c = categories.value[slide.value.index]!
  return { ...c, layout: layoutFor(slide.value.index, c.rows.length) }
})
const atEnd = computed(() => step.value >= slides.value.length - 1)

const next = () => (step.value = Math.min(step.value + 1, slides.value.length - 1))
const back = () => (step.value = Math.max(step.value - 1, 0))

const phase = computed(() => (award.value ? phaseOf(award.value) : 'open'))
const voters = computed(() => votersFor(slug.value))
const stage = ref<HTMLElement | null>(null)

// Fullscreen is the whole point on a second monitor; OBS captures the browser
// source instead and never needs it.
const isFull = ref(false)
async function toggleFull() {
  if (document.fullscreenElement) await document.exitFullscreen()
  else await stage.value?.requestFullscreen?.()
}
const onFullChange = () => (isFull.value = !!document.fullscreenElement)

function onKey(e: KeyboardEvent) {
  const keys = [' ', 'ArrowRight', 'PageDown', 'ArrowLeft', 'PageUp', 'Home', 'End', 'f']
  if (!keys.includes(e.key)) return
  e.preventDefault()
  if ([' ', 'ArrowRight', 'PageDown'].includes(e.key)) next()
  else if (['ArrowLeft', 'PageUp'].includes(e.key)) back()
  else if (e.key === 'Home') step.value = 0
  else if (e.key === 'End') step.value = slides.value.length - 1
  else if (e.key === 'f') toggleFull()
}

// The control bar must not sit in the shot: it fades out when the mouse rests.
const idle = ref(false)
let idleTimer: ReturnType<typeof setTimeout> | null = null
function wake() {
  idle.value = false
  if (idleTimer) clearTimeout(idleTimer)
  idleTimer = setTimeout(() => (idle.value = true), 2600)
}

onMounted(() => {
  // First time through, the setup opens itself: a host who has never seen it would
  // otherwise go live without knowing the stage, the face and the reveal are theirs
  // to choose. Saved settings mean it stays out of the way after that.
  if (!bare.value && !configured.value && categories.value.length) setupOpen.value = true
  window.addEventListener('keydown', onKey)
  document.addEventListener('fullscreenchange', onFullChange)
  wake()
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  document.removeEventListener('fullscreenchange', onFullChange)
  if (idleTimer) clearTimeout(idleTimer)
})

const titleWords = computed(() => (award.value?.name ?? '').trim().split(/\s+/).map((w) => [...w]))

/**
 * The winner lands, in the style the host picked. Three different arrivals, one
 * per timeline - not three variations of a fade.
 */
function playReveal() {
  const { gsap } = useGsap()
  const line = '.js-winner-line'
  const plate = '.js-winner'

  if (settings.value.reveal === 'spotlight') {
    // the room drops away and one light finds the name
    gsap.fromTo('.s-nom, .s-line', { opacity: 0.55 }, { opacity: (i, el: Element) => (el.classList.contains('js-winner') ? 1 : 0.18), duration: 0.7, ease: 'power2.out' })
    gsap.fromTo(plate, { scale: 0.92, filter: 'brightness(0.5)' }, { scale: 1.1, filter: 'brightness(1)', duration: 0.9, ease: 'expo.out' })
    gsap.fromTo(line, { opacity: 0, filter: 'blur(10px)' }, { opacity: 1, filter: 'blur(0px)', duration: 0.8, delay: 0.1, ease: 'expo.out' })
    return
  }
  if (settings.value.reveal === 'flip') {
    gsap.fromTo(plate, { rotateX: -90, opacity: 0 }, { rotateX: 0, opacity: 1, duration: 0.75, ease: 'back.out(1.5)', transformPerspective: 800, stagger: 0.06 })
    gsap.fromTo(line, { rotateX: -90, opacity: 0 }, { rotateX: 0, opacity: 1, duration: 0.7, delay: 0.18, ease: 'back.out(1.4)', transformPerspective: 800 })
    return
  }
  // cut: the winner's name climbs in, letter by letter
  gsap.fromTo(plate, { scale: 0.88, opacity: 0.2 }, { scale: 1.1, opacity: 1, duration: 0.7, ease: 'expo.out', stagger: 0.07 })
  gsap.fromTo(line, { yPercent: 120, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.8, delay: 0.1, ease: 'expo.out' })
}

watch(
  () => [step.value, slide.value.kind] as const,
  () => {
    if (prefersReducedMotion()) return
    const { gsap } = useGsap()
    if (slide.value.kind === 'title') {
      gsap.fromTo('.js-open', { yPercent: 115 }, { yPercent: 0, duration: 0.95, ease: 'expo.out', stagger: { each: 0.025, from: 'center' } })
      return
    }
    if (slide.value.kind === 'category' && slide.value.shown) playReveal()
  },
  { flush: 'post' },
)

const obsLink = ref('')
const copied = ref(false)
async function copyObs() {
  obsLink.value = `${location.origin}/my-awards/${slug.value}/reveal?bare=1`
  try {
    await navigator.clipboard.writeText(obsLink.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 2400)
  } catch {
    /* clipboard blocked - the link is printed next to the button */
  }
}

const armPublish = ref(false)
function onPublish() {
  if (!armPublish.value) {
    armPublish.value = true
    setTimeout(() => (armPublish.value = false), 4000)
    return
  }
  publishResults(slug.value)
  armPublish.value = false
}

/** What the caption under the stage says out of shot, for the host only. */
const note = computed(() => {
  if (!current.value) return ''
  if (!current.value.votes) return 'Nobody voted in this category. Skip it or announce it as no contest.'
  if (current.value.tied) return 'Tied. Pick one before you announce, or call it a tie on air.'
  return ''
})

useSeoMeta({
  title: () => (award.value ? `${award.value.name}: reveal` : 'Reveal'),
  robots: 'noindex, nofollow',
})
definePageMeta({ chrome: false })
</script>

<template>
  <div class="min-h-screen bg-canvas text-ink" @mousemove="wake">
    <template v-if="award && categories.length">
      <!-- THE STAGE - everything in this box is what the stream sees -->
      <div
        ref="stage"
        class="stage relative mx-auto flex w-full flex-col items-center justify-center overflow-hidden text-center"
        :class="bare ? 'h-screen w-screen' : 'mt-4 aspect-video max-w-[1600px] rounded-card'"
        :style="themeCss(
          settings.stage === COVER ? undefined : settings.stage,
          accent,
          settings.stage === COVER ? award.look?.coverUrl : undefined,
        )"
      >
        <span aria-hidden="true" class="absolute inset-0 bg-black/50" />

        <div class="stage-body relative flex w-full flex-col items-center" role="status" aria-live="polite">
          <!-- title card: the same letter-by-letter arrival as the publish curtain,
               so the show opens in the language the product already speaks -->
          <template v-if="slide.kind === 'title'">
            <p class="s-kicker" :style="{ color: ink }">{{ award.host.name }} presents</p>
            <h1 class="s-title max-w-[16ch]" :style="{ fontFamily: headlineFont }">
              <span class="sr-only">{{ award.name }}</span>
              <span aria-hidden="true" class="flex flex-wrap justify-center gap-x-[0.26em]">
                <span v-for="(word, w) in titleWords" :key="w" class="flex">
                  <span v-for="(char, c) in word" :key="c" class="block overflow-hidden">
                    <span class="js-open block">{{ char }}</span>
                  </span>
                </span>
              </span>
            </h1>
            <p class="s-meta">
              {{ categories.length }} {{ categories.length === 1 ? 'category' : 'categories' }} ·
              {{ voters }} {{ voters === 1 ? 'ballot' : 'ballots' }} · voted by the chat
            </p>
          </template>

          <!-- one category: nominees first, winner on the next click -->
          <template v-else-if="slide.kind === 'category' && current">
            <p class="s-kicker" :style="{ color: ink }">{{ award.name }}</p>
            <h2 class="s-title max-w-[18ch]" :style="{ fontFamily: headlineFont }">
              {{ current.nomination.title || 'Untitled category' }}
            </h2>

            <!-- plates across the middle, or two of them facing each other -->
            <ul
              v-if="current.layout !== 'list'"
              class="s-noms m-0 flex list-none flex-wrap justify-center p-0"
              :class="current.layout === 'duel' && 's-noms-duel'"
            >
              <li
                v-for="row in current.rows"
                :key="row.nominee.id"
                class="s-nom flex flex-col items-center transition-[opacity,transform] duration-500 ease-gala"
                :class="[
                  slide.shown && current.winners.includes(row) ? 'js-winner s-nom-win' : '',
                  slide.shown && !current.winners.includes(row) ? 'opacity-25' : '',
                ]"
              >
                <span class="s-plate grid place-items-center font-bold" :style="plate(slide.shown && current.winners.includes(row))">
                  {{ nomineeInitials(row.nominee) }}
                </span>
                <span class="s-name break-words">{{ nomineeName(row.nominee) }}</span>
              </li>
            </ul>

            <!-- numbered lines: long names fit, and the eye runs down instead of across -->
            <ol v-else class="s-list-noms m-0 flex list-none flex-col p-0 text-left">
              <li
                v-for="(row, i) in current.rows"
                :key="row.nominee.id"
                class="s-line flex items-center transition-[opacity,transform] duration-500 ease-gala"
                :class="[
                  slide.shown && current.winners.includes(row) ? 'js-winner s-line-win' : '',
                  slide.shown && !current.winners.includes(row) ? 'opacity-25' : '',
                ]"
              >
                <span class="s-line-i tnum" :style="{ color: ink }">{{ String(i + 1).padStart(2, '0') }}</span>
                <span class="s-line-name min-w-0 flex-1 truncate">{{ nomineeName(row.nominee) }}</span>
                <span
                  v-if="slide.shown"
                  class="s-line-pct tnum"
                  :style="{ color: current.winners.includes(row) ? ink : undefined }"
                >{{ row.pct }}%</span>
              </li>
            </ol>

            <p class="js-winner-line s-win" :style="{ color: ink, fontFamily: headlineFont }">
              <template v-if="!slide.shown">And the winner is...</template>
              <template v-else-if="!current.winners.length">No votes in this category</template>
              <template v-else-if="current.tied">
                {{ current.winners.map((w) => nomineeName(w.nominee)).join(' & ') }} · tied
              </template>
              <template v-else>
                {{ nomineeName(current.winners[0]!.nominee) }}
              </template>
            </p>
            <p v-if="slide.shown && current.winners.length && !current.tied" class="s-win-sub tnum">
              {{ current.winners[0]!.votes }} of {{ current.votes }} votes · {{ current.winners[0]!.pct }}%
            </p>
          </template>

          <!-- closing card: the whole list, for the outro talk -->
          <template v-else>
            <p class="s-kicker" :style="{ color: ink }">{{ award.name }}</p>
            <h2 class="s-title" :style="{ fontFamily: headlineFont }">That is the show</h2>
            <ul class="s-list m-0 grid list-none p-0 text-left sm:grid-cols-2">
              <li v-for="c in categories" :key="c.nomination.id">
                <span class="text-ink-2">{{ c.nomination.title }}</span>
                <span class="mx-2 text-ink-muted">-</span>
                <span class="font-semibold" :style="{ color: ink }">
                  {{ c.winners.length ? c.winners.map((w) => nomineeName(w.nominee)).join(' & ') : 'no votes' }}
                </span>
              </li>
            </ul>
          </template>
        </div>

        <!-- the category number, set big and quiet behind the content -->
        <span
          v-if="slide.kind === 'category'"
          aria-hidden="true"
          class="s-index absolute"
          :style="{ color: accent, fontFamily: headlineFont }"
        >{{ String(slide.index + 1).padStart(2, '0') }}</span>

        <span class="s-mark tnum absolute text-ink-muted" style="bottom: 2.4cqh; left: 2cqw">
          {{ step + 1 }} / {{ slides.length }}
        </span>

        <!-- how far through the evening we are -->
        <span aria-hidden="true" class="absolute inset-x-0 bottom-0 h-[0.5cqh] bg-white/10">
          <span
            class="block h-full origin-left transition-transform duration-700 ease-gala"
            :style="{ background: accent, transform: `scaleX(${(step + 1) / slides.length})` }"
          />
        </span>
      </div>

      <!-- CONTROLS - out of the shot: hidden in OBS, faded out when the mouse rests -->
      <div
        v-if="!bare"
        class="mx-auto max-w-[1600px] px-4 transition-opacity duration-500"
        :class="idle && isFull ? 'opacity-0' : 'opacity-100'"
      >
        <div class="mt-4 flex flex-wrap items-center gap-3">
          <UiButton variant="ghost" size="sm" :disabled="step === 0" @click="back">
            <UiIcon name="chevron-left" :size="14" /> Back
          </UiButton>
          <UiButton size="sm" :disabled="atEnd" @click="next">
            <span class="grid">
              <span aria-hidden="true" class="col-start-1 row-start-1 invisible">Reveal the winner</span>
              <span class="col-start-1 row-start-1">{{ slide.kind === 'category' && !slide.shown ? 'Reveal the winner' : 'Next' }}</span>
            </span>
            <UiIcon name="chevron-right" :size="14" />
          </UiButton>
          <UiButton variant="ghost" size="sm" @click="setupOpen = true">Look and motion</UiButton>
          <span class="text-sm text-ink-muted">Space or arrows work too. F for fullscreen.</span>

          <button
            type="button"
            class="ml-auto h-11 rounded-btn border border-hair px-4 text-sm font-bold uppercase tracking-button transition-colors hover:border-gold hover:text-gold-text"
            @click="copyObs"
          >
            <span class="grid">
              <span aria-hidden="true" class="col-start-1 row-start-1 invisible">Copy OBS link</span>
              <span class="col-start-1 row-start-1">{{ copied ? 'Link copied' : 'Copy OBS link' }}</span>
            </span>
          </button>
          <UiButton variant="ghost" size="sm" @click="toggleFull">
            <span class="grid">
              <span aria-hidden="true" class="col-start-1 row-start-1 invisible">Leave fullscreen</span>
              <span class="col-start-1 row-start-1">{{ isFull ? 'Leave fullscreen' : 'Fullscreen' }}</span>
            </span>
          </UiButton>
        </div>

        <p v-if="obsLink" class="mt-3 break-all text-sm text-ink-muted">
          Browser source, 1920 × 1080: <span class="text-ink-2">{{ obsLink }}</span> - it shows the stage
          and nothing else, and follows the clicks you make here.
        </p>
        <p v-if="note" class="mt-3 text-sm text-warn">{{ note }}</p>

        <!-- state of the vote, and the one action that belongs after a ceremony -->
        <div class="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-hair pt-6">
          <p v-if="phase === 'open' || phase === 'soon'" class="text-sm text-warn">
            Voting is still open, so these numbers can change. Close it on the dashboard before you go live.
          </p>
          <p v-else-if="phase === 'revealed'" class="text-sm text-ink-muted">
            The winners are already on the public page.
          </p>
          <p v-else class="text-sm text-ink-muted">
            Voting is closed and nobody has seen these results yet.
          </p>

          <UiButton
            v-if="phase === 'counting' || phase === 'capped'"
            size="sm"
            class="ml-auto"
            @click="onPublish"
          >
            <span class="grid">
              <span aria-hidden="true" class="col-start-1 row-start-1 invisible">Publish the winners</span>
              <span class="col-start-1 row-start-1">{{ armPublish ? 'Publish - sure?' : 'Publish the winners' }}</span>
            </span>
          </UiButton>
          <UiButton :to="`/my-awards/${slug}`" variant="ghost" size="sm" :class="phase === 'counting' || phase === 'capped' ? '' : 'ml-auto'">
            Back to the dashboard
          </UiButton>
        </div>
      </div>
    </template>

    <!-- nothing to announce: say which of the two reasons it is -->
    <div v-else class="shell py-20 text-center">
      <h1 class="heading">{{ award ? 'Nothing to announce yet' : 'No ceremony for this one' }}</h1>
      <p class="mx-auto mt-4 max-w-copy text-ink-2">
        {{
          award
            ? 'Every category is still empty. Add nominees in the builder and the ceremony has something to run through.'
            : 'Either this awards was published in another browser, or the address is wrong. Ceremonies are only for awards you host.'
        }}
      </p>
      <div class="mt-6 flex flex-wrap justify-center gap-3">
        <UiButton :to="award ? '/create' : '/my-awards'">{{ award ? 'Open the builder' : 'Your awards' }}</UiButton>
      </div>
    </div>
    <CeremonySetup
      :open="setupOpen"
      :settings="settings"
      :accent="accent"
      :name="award?.name ?? ''"
      :cover="award?.look?.coverUrl ?? ''"
      @update="update"
      @close="setupOpen = false"
      @start="onStart"
    />
  </div>
</template>

<style scoped>
/*
 * The deck is sized against the stage, not the window: the same slide has to read
 * the same in a 1440px page preview, in fullscreen on a second monitor and in a
 * 1920x1080 OBS browser source. Container units do that; vw would shrink the type
 * every time the stage is not the whole window.
 */
.stage {
  container-type: size;
  padding: 4cqh 6cqw;
}
.stage-body {
  gap: 3.2cqh;
}
.s-kicker {
  font-size: 1.5cqw;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.s-title {
  font-size: 5.6cqw;
  font-weight: 800;
  line-height: 1.02;
  letter-spacing: -0.015em;
  text-transform: uppercase;
  text-wrap: balance;
  margin: 0;
}
.s-meta {
  font-size: 1.9cqw;
  color: #a5a5ac;
}
.s-noms {
  gap: 3cqw;
}
.s-nom {
  width: 12cqw;
  gap: 1.2cqh;
  opacity: 0.75;
}
.s-nom-win {
  opacity: 1;
  transform: scale(1.1);
}
.s-plate {
  width: 8.5cqw;
  height: 8.5cqw;
  border-radius: 1.4cqw;
  font-size: 2.6cqw;
}
.s-name {
  font-size: 1.5cqw;
}
.s-win {
  font-size: 4cqw;
  font-weight: 800;
  line-height: 1.1;
}
.s-win-sub {
  font-size: 1.5cqw;
  color: #a5a5ac;
  margin-top: -1.6cqh;
}

/* duel: two nominees, twice the presence */
.s-noms-duel {
  gap: 7cqw;
}
.s-noms-duel .s-nom {
  width: 18cqw;
}
.s-noms-duel .s-plate {
  width: 13cqw;
  height: 13cqw;
  border-radius: 2cqw;
  font-size: 4cqw;
}
.s-noms-duel .s-name {
  font-size: 2cqw;
}

/* numbered lines */
.s-list-noms {
  width: 62cqw;
  gap: 1.6cqh;
}
.s-line {
  gap: 2cqw;
  font-size: 2.6cqw;
  opacity: 0.8;
}
.s-line-win {
  opacity: 1;
  font-weight: 700;
}
.s-line-i {
  font-size: 1.6cqw;
  font-weight: 700;
  width: 3cqw;
}
.s-line-pct {
  font-size: 1.8cqw;
  color: #a5a5ac;
}

/* the category number, behind everything */
.s-index {
  right: 3cqw;
  top: 2cqh;
  font-size: 18cqw;
  font-weight: 800;
  line-height: 1;
  opacity: 0.14;
  pointer-events: none;
}
.s-list {
  font-size: 1.7cqw;
  gap: 1.4cqh 5cqw;
}
.s-mark {
  font-size: 1.1cqw;
}
</style>
