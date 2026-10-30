<script setup lang="ts">
// The Envelope ballot as Ed's prototype draws it (2026-10-22): every category on
// one page, a sticky list of them on the left that ticks as you pick, and a bar
// at the foot with the progress and the one submit. A first pick in a category
// scrolls on to the next open one. Once voting is shut the same list shows the
// nominees locked, and after the ceremony the results, most votes first.
// State and submit are the page's (composables/useBallot.ts).
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { Award, Nomination, Nominee } from '~/types/award'
import type { Tally } from '~/composables/useVoting'
import { resultsOf } from '~/composables/useVoting'
import type { SignInProvider } from '~/composables/useAccount'
import NomineeThumb from '~/components/ui/NomineeThumb.vue'
import MediaLightbox from '~/components/ui/MediaLightbox.vue'
import EnvSignIn from './EnvSignIn.vue'
import { avatarFallback, channelAvatar, nomineeInitials, nomineeName, nomineeSub, nomineeTint } from '~/utils/nominee'
import '~/assets/css/envelope-award.css'

const props = defineProps<{
  award: Award
  tally: Tally
  mode: 'vote' | 'locked' | 'results'
  /** every pick on screen, sent or not */
  shown: Record<string, string>
  cast: Record<string, string>
  voted: boolean
  pickedCount: number
  signedIn: boolean
  voteError: string
  /** what state the show is in, when it is not simply open */
  note?: string
}>()
const emit = defineEmits<{ pick: [nominationId: string, nomineeId: string]; submit: [provider?: SignInProvider] }>()

const PF = { twitch: 'tw', kick: 'kk', youtube: 'yt' } as const
const CHURL = { twitch: (n: string) => `https://www.twitch.tv/${n}`, kick: (n: string) => `https://kick.com/${n}`, youtube: (n: string) => `https://www.youtube.com/@${n}` }

const cats = computed<Nomination[]>(() => props.award.nominations)
const numbers = computed(() => !props.award.hideCounts)
const resultsBy = computed(() => Object.fromEntries(cats.value.map((c) => [c.id, props.mode === 'results' ? resultsOf(props.tally, c) : []])))
const ordered = (c: Nomination): Nominee[] => (props.mode === 'results' ? resultsBy.value[c.id]!.map((r) => r.nominee) : c.nominees)
const resultOf = (c: Nomination, id: string) => resultsBy.value[c.id]!.find((r) => r.nominee.id === id)
const winnersIn = (c: Nomination) => resultsBy.value[c.id]!.filter((r) => r.top)

const picked = computed(() => cats.value.filter((c) => props.shown[c.id]).length)
const pending = computed(() => cats.value.filter((c) => props.shown[c.id] && !props.cast[c.id]).length)
const sent = computed(() => cats.value.filter((c) => props.cast[c.id]).length)

const root = ref<HTMLElement | null>(null)
const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches
function goCat(i: number) {
  root.value?.querySelector(`#cat-${i}`)?.scrollIntoView({ behavior: reduce() ? 'auto' : 'smooth', block: 'start' })
}
// "Start voting" in the masthead
function start() {
  root.value?.scrollIntoView({ behavior: reduce() ? 'auto' : 'smooth', block: 'start' })
  root.value?.querySelector<HTMLElement>('.ap-nom[tabindex="0"]')?.focus({ preventScroll: true })
}
defineExpose({ start, go: goCat })

function pick(c: Nomination, n: Nominee) {
  if (props.mode !== 'vote' || props.cast[c.id]) return
  const first = !props.shown[c.id]
  emit('pick', c.id, n.id)
  // first pick in a category: bring the next open one into view
  if (first) {
    const ci = cats.value.indexOf(c)
    const nx = cats.value.findIndex((x, k) => k > ci && !props.shown[x.id])
    if (nx >= 0) setTimeout(() => goCat(nx), 380)
  }
}
function onKey(e: KeyboardEvent, c: Nomination, i: number) {
  const list = ordered(c)
  if ((e.key === ' ' || e.key === 'Enter') && list[i]) { e.preventDefault(); pick(c, list[i]); return }
  const d = ({ ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 } as Record<string, number>)[e.key]
  if (!d) return
  e.preventDefault()
  const box = (e.currentTarget as HTMLElement).parentElement!
  box.querySelectorAll<HTMLElement>('.ap-nom')[(i + d + list.length) % list.length]?.focus()
}

// which category is under the reader, and whether the bar has anything to say yet
const cur = ref(0)
const far = ref(true)
const barOff = computed(() => picked.value === 0 && far.value)
function mark() {
  const els = root.value ? [...root.value.querySelectorAll<HTMLElement>('.ap-cat')] : []
  let k = 0
  els.forEach((el, i) => { if (el.getBoundingClientRect().top < innerHeight * 0.45) k = i })
  cur.value = k
  const top = root.value?.getBoundingClientRect().top ?? 0
  far.value = top > innerHeight * 0.6
}
// capture: the full preview scrolls inside its popup, not the window
onMounted(() => { mark(); addEventListener('scroll', mark, { passive: true, capture: true }) })
onBeforeUnmount(() => removeEventListener('scroll', mark, { capture: true }))

const signing = ref(false)
function submit() {
  if (props.signedIn) emit('submit')
  else signing.value = true
}
function signIn(p: SignInProvider) {
  signing.value = false
  emit('submit', p)
}

const viewing = ref<{ src?: string; url?: string; title: string } | null>(null)
const status = (c: Nomination) =>
  props.mode === 'results' ? '' : props.cast[c.id] ? 'Your vote is in' : props.shown[c.id] ? 'Picked' : props.mode === 'vote' ? (props.voted ? 'Still open' : 'Pick one') : ''
</script>

<template>
  <section id="vote" ref="root" class="ap-ballot" aria-labelledby="ballot-h">
    <div class="ap-ballot-h">
      <h2 id="ballot-h">{{ mode === 'results' ? 'The winners' : mode === 'locked' ? 'The nominees' : 'Your votes' }}</h2>
      <p v-if="note && mode === 'locked'">{{ note }}</p>
      <p v-if="mode === 'vote'">Pick one nominee in each category. Skip any you like: they stay open until voting closes.</p>
      <p v-else-if="mode === 'results'">{{ numbers ? 'Every category, most votes first.' : 'Every category, in finishing order. The host kept the counts private.' }}</p>
    </div>

    <div class="ap-grid">
      <nav class="ap-nav" aria-label="Categories">
        <p class="ap-nav-p">{{ picked }} of {{ cats.length }} {{ voted ? 'counted' : mode === 'vote' ? 'picked' : 'categories' }}</p>
        <ol>
          <li v-for="(c, i) in cats" :key="c.id">
            <a :href="`#cat-${i}`" :class="{ ok: !!shown[c.id] || mode === 'results', cur: i === cur }" @click.prevent="goCat(i)"><i />{{ c.title || 'Untitled category' }}</a>
          </li>
        </ol>
      </nav>

      <div class="cats">
        <section v-for="(c, ci) in cats" :id="`cat-${ci}`" :key="c.id" class="ap-cat" :aria-labelledby="`cat-h-${ci}`">
          <div class="ap-cat-h">
            <h3 :id="`cat-h-${ci}`"><small>Category {{ ci + 1 }} of {{ cats.length }}</small>{{ c.title || 'Untitled category' }}</h3>
            <span class="lbl" :class="{ ok: !!shown[c.id] }">
              <template v-if="mode === 'results'">{{ numbers ? `${resultsBy[c.id]!.reduce((s, r) => s + r.votes, 0)} votes` : winnersIn(c).length > 1 ? 'Tied' : '' }}</template>
              <template v-else>{{ status(c) }}</template>
            </span>
          </div>
          <div class="ap-noms" :role="mode === 'results' ? 'list' : 'radiogroup'" :aria-labelledby="`cat-h-${ci}`">
            <div
              v-for="(n, i) in ordered(c)"
              :key="n.id"
              class="ap-nom"
              :class="{ win: resultOf(c, n.id)?.top }"
              :role="mode === 'results' ? 'listitem' : 'radio'"
              :tabindex="mode === 'results' ? -1 : (shown[c.id] ? shown[c.id] === n.id : i === 0) ? 0 : -1"
              :aria-checked="mode === 'results' ? undefined : shown[c.id] === n.id"
              :aria-disabled="mode !== 'vote' || !!cast[c.id] ? 'true' : undefined"
              @click="pick(c, n)"
              @keydown="onKey($event, c, i)"
            >
              <span v-if="n.kind === 'media'" class="ap-media art" :class="n.image && 'is-img'">
                <NomineeThumb :nominee="n" :width="320" />
                <button
                  v-if="n.image || n.url"
                  type="button"
                  class="ap-play"
                  :class="n.image && 'img'"
                  :aria-label="`${n.image ? 'View' : 'Play'} ${nomineeName(n)}`"
                  @click.stop="viewing = n.image ? { src: n.image, title: nomineeName(n) } : { url: n.url, title: nomineeName(n) }"
                >{{ n.image ? 'View' : 'Play clip' }}</button>
              </span>
              <span v-else class="ap-media pers">
                <span class="ap-avw">
                  <img v-if="n.kind === 'channel'" class="av env-avimg" :src="channelAvatar(n.channel)" alt="" loading="lazy" @error="avatarFallback($event, n.channel.name)">
                  <span v-else class="av" :style="{ background: nomineeTint(n) }">{{ nomineeInitials(n) }}</span>
                  <span v-if="n.kind === 'channel'" class="ap-pf" :class="PF[n.channel.platform]" />
                </span>
              </span>
              <span class="ap-nm"><b>{{ nomineeName(n) }}</b><span>{{ nomineeSub(n) }}</span></span>
              <a
                v-if="n.kind === 'channel' && mode !== 'results'"
                class="ap-out"
                :href="CHURL[n.channel.platform](n.channel.name)"
                target="_blank"
                rel="noopener"
                :aria-label="`Open ${n.channel.name}`"
                @click.stop
              />
              <span v-if="mode === 'results'" class="env-res">
                <b>{{ resultOf(c, n.id)?.top ? (winnersIn(c).length > 1 ? 'Tied' : 'Winner') : `#${i + 1}` }}</b>
                <template v-if="numbers">
                  <i :style="{ '--p': `${resultOf(c, n.id)?.pct ?? 0}%` }" /><span class="tnum">{{ resultOf(c, n.id)?.pct ?? 0 }}%</span>
                </template>
              </span>
              <span v-else class="tick" />
            </div>
          </div>
        </section>
      </div>
    </div>

    <!-- the bar: progress and the one submit -->
    <div v-if="mode === 'vote'" class="ap-bar env-bar" :class="{ off: barOff }" aria-live="polite">
      <div class="ap-bar-in">
        <div class="ap-prog" aria-hidden="true"><i v-for="c in cats" :key="c.id" :class="{ on: !!shown[c.id] }" /></div>
        <p v-if="voted && !pending"><b>Your votes are in.</b> {{ sent }} of {{ cats.length }} categories counted.{{ sent < cats.length ? ' The rest stay open until voting closes.' : ' Results come out at the ceremony.' }}</p>
        <p v-else-if="voted"><b>{{ pending }} new {{ pending === 1 ? 'pick' : 'picks' }}</b> · {{ sent }} already counted</p>
        <p v-else-if="picked"><b class="tnum">{{ picked }} of {{ cats.length }}</b> picked<span class="env-hide-sm"> · skipped ones stay open</span></p>
        <p v-else><b class="tnum">0 of {{ cats.length }}</b> picked<span class="env-hide-sm"> · choose a nominee to start</span></p>
        <button v-if="!voted || pending" class="btn p" type="button" :disabled="!pickedCount" @click="submit">
          {{ !pickedCount ? 'Pick at least one' : voted ? `Add ${pending} ${pending === 1 ? 'vote' : 'votes'}` : `Submit ${pickedCount} ${pickedCount === 1 ? 'vote' : 'votes'}` }}
        </button>
      </div>
      <p v-if="voteError" class="env-err" role="alert">{{ voteError }}</p>
    </div>

    <ClientOnly><EnvSignIn :open="signing" @close="signing = false" @choose="signIn" /></ClientOnly>
    <MediaLightbox
      :open="!!viewing"
      :src="viewing?.src ?? ''"
      :url="viewing?.url ?? ''"
      :title="viewing?.title ?? ''"
      @close="viewing = null"
    />
  </section>
</template>
