<script setup lang="ts">
// The ceremony itself: a slideshow the host clicks through live on stream, one
// category at a time. The point is what it does NOT show - a dashboard on screen
// gives away every result at once, which is the failure the journey map flagged
// for this step (docs-auto/knowledge, "Ceremony").
//
// Model comes from the Reveal screen in mockup v2 (outputs/awards-builder-mockup.html):
// a 16:9 stage in the award's own look, award name as the kicker, the category as
// the headline, the nominees and "And the winner is...". Two beats per category,
// so the pause is the host's to hold: the second is the winner's own screen -
// their picture big, their clip playing, the name, the count (review 2026-10-08:
// "the winner needs a screen of their own, so it is clear who won").
import ClipPlayer from '~/components/ui/ClipPlayer.vue'
import { playRevealMotion } from '~/utils/revealMotion'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import UiButton from '~/components/ui/UiButton.vue'
import UiIcon from '~/components/ui/UiIcon.vue'
import { useAwardPage } from '~/composables/useAwards'
import { emptyTally, phaseOf, resultsOf, useVoting, votesInOf } from '~/composables/useVoting'
import { prefersReducedMotion, useGsap } from '~/composables/useReveal'
import { channelAvatar, nomineeImage, nomineeInitials, nomineeName } from '~/utils/nominee'
import CeremonySetup from '~/components/ui/CeremonySetup.vue'
import { stageImage, useCeremony } from '~/composables/useCeremony'
import type { Nominee } from '~/types/award'
import { partnerHost, partnerIconUrl } from '~/utils/partnerIcon'
import { themeCss } from '~/data/themes'
import { accentText, accentOf, inkOnFlood, onAccent, tint } from '~/utils/accent'
import { DISPLAY_FONTS, useDisplayFonts } from '~/composables/useDisplayFonts'
import { useVersion } from '~/composables/useVersion'
import { confetti, createCeremonySound, drumroll, stageMotes } from '~/utils/ceremonyFx'
import '~/assets/css/envelope-ceremony.css'

// ceremony typefaces and share cards draw in any of the headline faces
useDisplayFonts(DISPLAY_FONTS)

const route = useRoute()
const slug = computed(() => String(route.params.slug))
const { publishResults } = useVoting()

// Everything the show needs is fetched once, up front: a slideshow that awaited
// a request per slide would stall on air.
const { data, refresh } = await useAwardPage(() => slug.value)
const award = computed(() => data.value?.award ?? null)
const tally = computed(() => data.value?.tally ?? emptyTally())
const accent = computed(() => accentOf(award.value?.look))
const ink = computed(() => accentText(accent.value))
const stageInk = ink
// The ceremony has its own stage, face and reveal - set once, kept per awards.
const { settings, update, configured } = useCeremony(() => slug.value, () => award.value)
const setupOpen = ref(false)
/** Starting the show is a decision too: it saves the settings, so the setup does
 *  not greet the host again every time they open the ceremony. */
async function onStart() {
  await update({})
  setupOpen.value = false
  step.value = 0
}
const headlineFont = computed(() => `'${settings.value.font}', Archivo, sans-serif`)
// the Envelope speaks the show's name in Gloock unless the host picked a face (review 2026-10-16, item 10)
const showFont = computed(() =>
  !award.value?.look?.font && settings.value.font === 'Hanken Grotesk' ? "'Gloock', Georgia, serif" : headlineFont.value,
)

// the show's cover, or a picture uploaded in the setup
const picture = computed(() => stageImage(settings.value, award.value?.look?.coverUrl))
const onCover = computed(() => !!picture.value)
const stageCss = computed(() =>
  !onCover.value && (!settings.value.stage || settings.value.stage === 'plain')
    ? 'background:#070707'
    : themeCss(picture.value ? undefined : settings.value.stage, accent.value, picture.value),
)
// the partners' corner (review 2026-10-08), unless the host switched it off
const demo = !!useRuntimeConfig().public.demo
const partners = computed(() => (award.value?.partners ?? []).filter((p) => p.name.trim()))
const partnerIcon = (url: string) => partnerIconUrl(partnerHost(url), demo)
/** a clip nominee plays on the winner's screen; an image one shows big */
const clipOf = (n: Nominee) => (n.kind === 'media' && n.url ? n.url : '')

/** A nominee plate: everyone in the house colour, the winner filled and lit. */
const plate = (won: boolean) =>
  won
      ? { background: accent.value, color: onAccent(accent.value), boxShadow: `0 0 6cqw ${tint(accent.value, '55')}` }
      : { background: 'rgba(246,244,238,.035)', color: '#F6F4EE', border: '0.12cqw solid rgba(246,244,238,.22)' }

/** OBS loads this page with ?bare=1: no controls, no chrome, just the stage. */
const bare = computed(() => 'bare' in route.query)

// A category with no nominees has nothing to announce, so it is not a slide.
const categories = computed(() =>
  (award.value?.nominations ?? [])
    .filter((n) => n.nominees.length)
    .map((nomination) => {
      const rows = resultsOf(tally.value, nomination)
      const lead = rows[0]?.votes ?? 0
      const tied = rows.filter((r) => r.votes === lead && r.votes > 0)
      return {
        nomination,
        rows,
        votes: votesInOf(tally.value, nomination),
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
function layoutFor(index: number, count: number, media: boolean): Layout {
  if (count === 2) return 'duel'
  if (count > 4) return 'list'
  // clips and images are the thing itself: shown as big frames, never as a list
  if (media) return 'row'
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
  const media = c.rows.some((r) => !!nomineeImage(r.nominee))
  return { ...c, media, layout: layoutFor(slide.value.index, c.rows.length, media) }
})
const atEnd = computed(() => step.value >= slides.value.length - 1)

/** The drumroll (reveal style 'drumroll'): sound is on until the host mutes it. */
const sound = import.meta.client ? createCeremonySound() : null
const soundOn = ref(true)
watch(soundOn, (v) => sound?.set(v))
const rolling = ref(false)
const fx = ref<HTMLCanvasElement | null>(null)
const flash = ref<HTMLElement | null>(null)
const motes = ref<HTMLCanvasElement | null>(null)

async function next() {
  if (rolling.value) return
  const s = slide.value, c = current.value
  // a drumroll runs on the nominees' screen and lands on the winner before the winner's own screen;
  // a tie has nobody to land on, so it goes straight to its own frame
  if (s.kind === 'category' && !s.shown && c && settings.value.reveal === 'drumroll' && c.winners.length === 1 && sound && !prefersReducedMotion()) {
    const cards = [...(stage.value?.querySelectorAll<HTMLElement>('.js-nom') ?? [])]
    if (cards.length) {
      rolling.value = true
      await drumroll(cards, c.rows.indexOf(c.winners[0]!), sound)
      cards.forEach((x) => x.classList.remove('is-hot'))
      rolling.value = false
    }
  }
  step.value = Math.min(step.value + 1, slides.value.length - 1)
}
const back = () => { if (!rolling.value) step.value = Math.max(step.value - 1, 0) }

const phase = computed(() => (award.value ? phaseOf(award.value, data.value?.voters ?? 0) : 'open'))
const voters = computed(() => data.value?.voters ?? 0)
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
  // the setup dialog owns the keyboard while it is open, and Space on a focused
  // control presses it rather than advancing the slide behind it (QA P2)
  if (setupOpen.value) return
  const t = e.target as HTMLElement | null
  if (t?.closest('button, a, input, select, textarea, [role=radio], [role=dialog]') && e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
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
  if (motes.value && !prefersReducedMotion()) stopMotes = stageMotes(motes.value)
})
let stopMotes: (() => void) | null = null
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  document.removeEventListener('fullscreenchange', onFullChange)
  if (idleTimer) clearTimeout(idleTimer)
  stopMotes?.()
})

// what a nominee card shows (the prototype's ceremony, Ed 2026-10-22): the channel's
// avatar or the image/clip still, the platform badge, and one quiet line under the name
const PF = { twitch: 'tw', kick: 'kk', youtube: 'yt' } as const
const PFN = { twitch: 'Twitch', kick: 'Kick', youtube: 'YouTube' } as const
const picOf = (n: Nominee) => (n.kind === 'channel' ? channelAvatar(n.channel) : nomineeImage(n))
const subOf = (n: Nominee) => (n.kind === 'channel' ? PFN[n.channel.platform] : n.kind === 'media' ? (n.url ? 'Clip' : 'Image') : '')
const SAY = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve']
const titleWords = computed(() => (award.value?.name ?? '').trim().split(/\s+/).map((w) => [...w]))

/** The winner lands on their screen, in the style the host picked (utils/revealMotion). */
function playReveal() {
  const { gsap } = useGsap()
  playRevealMotion(gsap, settings.value.reveal, {
    line: '.js-winner-line',
    plate: document.querySelector('.js-winner') ? '.js-winner' : null,
    rest: document.querySelector('.s-runners') ? '.s-runners' : null,
    stage: stage.value,
    reel: document.querySelector('.js-reel'),
  })
  if (settings.value.reveal === 'drumroll') land()
}

/** where the drumroll lands: a flash, the chord, confetti from the winner's plate */
function land() {
  const f = flash.value
  if (f) { f.classList.remove('go'); void f.offsetWidth; f.classList.add('go') }
  sound?.hit()
  const w = stage.value?.querySelector('.js-winner')?.getBoundingClientRect(), r = stage.value?.getBoundingClientRect()
  if (fx.value && w && r) confetti(fx.value, (w.left + w.width / 2 - r.left) / r.width, (w.top + w.height / 2 - r.top) / r.height)
}

/** The slot machine's strip: the other names, twice round, then the winner. */
const reel = computed(() => {
  const c = current.value
  const won = c?.winners[0]
  if (!c || !won || c.tied || settings.value.reveal !== 'slot') return []
  const others = c.rows.filter((r) => r !== won).map((r) => nomineeName(r.nominee))
  return [...others, ...others, nomineeName(won.nominee)]
})

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
  obsLink.value = `${location.origin}${asset(`/my-awards/${slug.value}/reveal`)}?bare=1`
  try {
    await navigator.clipboard.writeText(obsLink.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 2400)
  } catch {
    /* clipboard blocked - the link is printed next to the button */
  }
}

const { isArmed: publishArmed, arm: armPublish } = useArm()
async function onPublish() {
  if (!armPublish()) return
  await publishResults(slug.value)
  await refresh()
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
  <!-- pinned to true black rather than the site canvas: this screen is a captured
       stage, and in OBS anything behind the host's own background is a light leak -->
  <div class="min-h-screen bg-black text-ink" @mousemove="wake">
    <template v-if="award && categories.length">
      <!-- THE STAGE - everything in this box is what the stream sees -->
      <div
        ref="stage"
        class="stage relative mx-auto flex w-full flex-col justify-center overflow-hidden"
        :class="[bare ? 'h-screen w-screen' : 'mt-4 aspect-video max-w-[1600px] rounded-card', 'env-cer', rolling && 'is-rolling']"
        :style="stageCss"
      >
        <span v-if="onCover" aria-hidden="true" class="absolute inset-0 bg-black/50" />
        <canvas ref="motes" class="env-motes" aria-hidden="true" />

        <!-- the top line of every slide: the show on the left, where we are on the right -->
        <div class="s-top" aria-hidden="true">
          <span>{{ award.name }}</span>
          <span>{{ slide.kind === 'category' ? `Category ${slide.index + 1} of ${categories.length}` : `Hosted by ${award.host.name}` }}</span>
        </div>

        <div class="stage-body relative flex w-full flex-col" role="status" aria-live="polite">
          <!-- title card: the same letter-by-letter arrival as the publish curtain,
               so the show opens in the language the product already speaks -->
          <template v-if="slide.kind === 'title'">
            <p class="s-kicker" :style="{ color: stageInk }">Tonight · live on stream</p>
            <h1 class="s-title max-w-[16ch]" :style="{ fontFamily: showFont }">
              <span class="sr-only">{{ award.name }}</span>
              <span aria-hidden="true" class="flex flex-wrap gap-x-[0.26em]">
                <span v-for="(word, w) in titleWords" :key="w" class="flex">
                  <span v-for="(char, c) in word" :key="c" class="block overflow-hidden">
                    <span class="js-open block">{{ char }}</span>
                  </span>
                </span>
              </span>
            </h1>
            <p class="s-meta s-foot">
              {{ SAY[categories.length] ?? categories.length }} {{ categories.length === 1 ? 'category' : 'categories' }}.
              {{ voters }} {{ voters === 1 ? 'voter' : 'voters' }}. Every envelope opened on air.
            </p>
          </template>

          <!-- one category, first beat: the nominees as cards in a row, and the pause -->
          <template v-else-if="slide.kind === 'category' && current && !slide.shown">
            <p class="s-kicker" :style="{ color: stageInk }">The nominees for</p>
            <h2 class="s-title max-w-[18ch]" :style="{ fontFamily: headlineFont }">
              {{ current.nomination.title || 'Untitled category' }}
            </h2>
            <p class="s-win" :style="{ fontFamily: headlineFont }">And the winner is...</p>
            <ul class="s-cards m-0 list-none p-0" :class="current.rows.length > 6 && 'is-many'">
              <li v-for="row in current.rows" :key="row.nominee.id" class="js-nom s-card">
                <span class="s-card-av" :class="row.nominee.kind !== 'channel' && picOf(row.nominee) && 'is-still'">
                  <img v-if="picOf(row.nominee)" :src="picOf(row.nominee)" :alt="nomineeName(row.nominee)" />
                  <span v-else class="s-card-in">{{ nomineeInitials(row.nominee) }}</span>
                  <i v-if="row.nominee.kind === 'channel'" class="s-card-pf" :class="PF[row.nominee.channel.platform]" />
                </span>
                <b class="s-card-nm">{{ nomineeName(row.nominee) }}</b>
                <small v-if="subOf(row.nominee)">{{ subOf(row.nominee) }}</small>
              </li>
            </ul>
          </template>

          <!-- second beat: the winner's own screen -->
          <template v-else-if="slide.kind === 'category' && current">
            <p class="s-kicker" :style="{ color: stageInk }">{{ current.nomination.title || 'Untitled category' }}</p>

            <template v-if="current.winners.length">
              <div class="s-champs flex justify-center" :class="current.tied && 'is-tied'">
                <figure v-for="w in current.winners" :key="w.nominee.id" class="js-winner s-champ m-0">
                  <!-- the clip plays; an image or a channel is shown big -->
                  <ClipPlayer v-if="clipOf(w.nominee) && !current.tied" :url="clipOf(w.nominee)" :title="nomineeName(w.nominee)" autoplay class="s-champ-media" />
                  <span
                    v-else
                    class="s-champ-media grid place-items-center overflow-hidden font-bold"
                    :class="[!picOf(w.nominee) && 's-champ-initials', w.nominee.kind === 'channel' && 's-champ-av']"
                    :style="plate(true)"
                  >
                    <img v-if="picOf(w.nominee)" :src="picOf(w.nominee)" :alt="nomineeName(w.nominee)" class="h-full w-full object-cover" />
                    <template v-else>{{ nomineeInitials(w.nominee) }}</template>
                  </span>
                </figure>
              </div>

              <p class="js-winner-line s-champ-name" :style="{ color: stageInk, fontFamily: headlineFont }">
                <span v-if="reel.length" class="s-reel-box"><span class="js-reel s-reel"><span v-for="(n, k) in reel" :key="k">{{ n }}</span></span></span>
                <template v-else-if="current.tied">{{ current.winners.map((w) => nomineeName(w.nominee)).join(' & ') }} · tied</template>
                <template v-else>{{ nomineeName(current.winners[0]!.nominee) }}</template>
              </p>
              <p v-if="settings.counts" class="s-win-sub tnum">
                {{ current.winners[0]!.votes }} of {{ current.votes }} votes · {{ current.winners[0]!.pct }}%
              </p>
              <!-- the rest, small, for the host to read out -->
              <ol v-if="current.rows.length > current.winners.length" class="s-runners m-0 flex list-none flex-wrap justify-center p-0">
                <li v-for="row in current.rows.filter((r) => !current!.winners.includes(r))" :key="row.nominee.id" class="tnum">
                  {{ nomineeName(row.nominee) }} <span v-if="settings.counts">{{ row.pct }}%</span>
                </li>
              </ol>
            </template>
            <p v-else class="js-winner-line s-champ-name" :style="{ color: stageInk, fontFamily: headlineFont }">No votes in this category</p>
          </template>

          <!-- closing card: the whole list, for the outro talk -->
          <template v-else>
            <p class="s-kicker" :style="{ color: stageInk }">{{ award.name }}</p>
            <h2 class="s-title" :style="{ fontFamily: showFont }">That is the show</h2>
            <ul class="s-list m-0 grid list-none p-0 text-left sm:grid-cols-2">
              <li v-for="c in categories" :key="c.nomination.id">
                <span class="text-ink-2">{{ c.nomination.title }}</span>
                <span class="mx-2 text-ink-muted">-</span>
                <span class="font-semibold" :style="{ color: stageInk }">
                  {{ c.winners.length ? c.winners.map((w) => nomineeName(w.nominee)).join(' & ') : 'no votes' }}
                </span>
              </li>
            </ul>
          </template>
        </div>

        <!-- the partners, in the corner of every slide -->
        <div v-if="settings.partners && partners.length" class="s-partners absolute flex items-center" :style="{ color: stageInk }">
          <span class="s-partners-k">With</span>
          <span v-for="p in partners" :key="p.id" class="s-partner flex items-center">
            <img v-if="partnerIcon(p.url)" :src="partnerIcon(p.url)" alt="" aria-hidden="true" @error="($event.target as HTMLElement).remove()" />
            {{ p.name }}
          </span>
        </div>

        <!-- the category number, set big and quiet behind the content -->
        <span
          v-if="false"
          aria-hidden="true"
          class="s-index absolute"
          :style="{ color: accent, fontFamily: headlineFont }"
        >{{ String(slide.index + 1).padStart(2, '0') }}</span>

        <span class="s-mark tnum absolute text-ink-muted" style="bottom: 2.4cqh; left: 2cqw">
          {{ step + 1 }} / {{ slides.length }}
        </span>

        <!-- the drumroll's landing: one flash over the stage, confetti on top of it -->
        <span ref="flash" class="cer-flash" aria-hidden="true" />
        <canvas ref="fx" class="cer-fx" aria-hidden="true" />

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
          <UiButton variant="ghost" size="sm" :disabled="step === 0 || rolling" @click="back">
            <UiIcon name="chevron-left" :size="14" /> Back
          </UiButton>
          <UiButton size="sm" :disabled="atEnd || rolling" @click="next">
            <span class="grid">
              <span aria-hidden="true" class="col-start-1 row-start-1 invisible">Reveal the winner</span>
              <span class="col-start-1 row-start-1">{{ rolling ? 'Drumroll...' : slide.kind === 'category' && !slide.shown ? 'Reveal the winner' : 'Next' }}</span>
            </span>
            <UiIcon name="chevron-right" :size="14" />
          </UiButton>
          <UiButton variant="ghost" size="sm" @click="setupOpen = true">Look and motion</UiButton>
          <UiButton v-if="settings.reveal === 'drumroll'" variant="ghost" size="sm" :aria-pressed="soundOn" @click="soundOn = !soundOn">{{ soundOn ? 'Sound on' : 'Sound off' }}</UiButton>
          <span class="text-sm text-ink-muted">Space or arrows work too. F for fullscreen.</span>

          <button
            type="button"
            class="obs-copy ml-auto inline-flex h-11 items-center gap-2 rounded-btn border border-hair px-4 text-sm font-semibold transition-colors hover:border-gold hover:text-gold-text"
            @click="copyObs"
          >
            <i aria-hidden="true" />
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
              <span class="col-start-1 row-start-1">{{ publishArmed() ? 'Publish - sure?' : 'Publish the winners' }}</span>
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
      :has-partners="partners.length > 0"
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

/* clips and images: 16:9 frames, big enough to read on stream */
.s-noms-media .s-nom {
  width: 19cqw;
}
.s-noms-media .s-plate {
  width: 19cqw;
  height: 10.7cqw;
  border-radius: 1cqw;
}

/* the partners' corner: bottom right, clear of the slide counter on the left */
.s-partners {
  right: 2cqw;
  bottom: 2.4cqh;
  gap: 1.4cqw;
  font-size: 1.1cqw;
  font-weight: 700;
}
.s-partners-k {
  opacity: 0.7;
  font-size: 0.85cqw;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.s-partner {
  gap: 0.5cqw;
}
.s-partner img {
  width: 1.5cqw;
  height: 1.5cqw;
  border-radius: 50%;
  object-fit: contain;
}

/* the winner's own screen */
.s-champs {
  gap: 3cqw;
}
.s-champ-media {
  display: block;
  width: 46cqw;
  height: 25.9cqw;
  border-radius: 1.2cqw;
  overflow: hidden;
}
.s-champ-initials {
  display: grid;
  width: 20cqw;
  height: 20cqw;
  border-radius: 2.4cqw;
  font-size: 7cqw;
}
.is-tied .s-champ-media {
  width: 28cqw;
  height: 15.75cqw;
}
.is-tied .s-champ-initials {
  width: 15cqw;
  height: 15cqw;
  font-size: 5cqw;
}
.s-champ-name {
  font-size: 5.4cqw;
  font-weight: 800;
  line-height: 1.1;
  text-transform: uppercase;
}
/* the slot machine: one line tall, the strip rolls inside it */
.s-reel-box {
  display: inline-block;
  height: 1.1em;
  overflow: hidden;
  vertical-align: top;
}
.s-reel {
  display: flex;
  flex-direction: column;
}
.s-reel > span {
  height: 1.1em;
}
.s-runners {
  gap: 0.6cqh 2.4cqw;
  font-size: 1.5cqw;
  opacity: 0.75;
}
.s-runners span {
  margin-left: 0.4cqw;
  opacity: 0.7;
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
.s-noms-duel.s-noms-media .s-nom {
  width: 30cqw;
}
.s-noms-duel.s-noms-media .s-plate {
  width: 30cqw;
  height: 16.9cqw;
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
.s-line-i {
  font-size: 1.6cqw;
  font-weight: 700;
  width: 3cqw;
}
.s-line-thumb {
  width: 8cqw;
  height: 4.5cqw;
  border-radius: 0.5cqw;
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
/* the library's copy glyph, in the button's own colour (Ed, 2026-10-22) */
.obs-copy i { width: 16px; height: 16px; flex: none; background: currentColor; -webkit-mask: url('~/assets/envelope/sys/copy.svg') center/contain no-repeat; mask: url('~/assets/envelope/sys/copy.svg') center/contain no-repeat; }
</style>
