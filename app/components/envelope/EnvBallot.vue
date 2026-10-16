<script setup lang="ts">
// The Envelope ballot (review 2026-10-16, item 1): a stepper, not a scroll. One
// category on screen at a time, the progress as the prototype's brass dashes,
// Back / Next / Skip, a pick slides on to the next category, and the last step is
// a check of every pick before the one sign-in. After a ballot is in, the steps
// are only the categories that were skipped; once voting is shut the same steps
// show the nominees locked, and after the ceremony the results.
// State and submit are the page's (composables/useBallot.ts), shared by every version.
import { computed, nextTick, ref, watch } from 'vue'
import type { Award, Nomination, Nominee } from '~/types/award'
import type { Result, Tally } from '~/composables/useVoting'
import { resultsOf } from '~/composables/useVoting'
import type { SignInProvider } from '~/composables/useAccount'
import SignInButtons from '~/components/ui/SignInButtons.vue'
import NomineeThumb from '~/components/ui/NomineeThumb.vue'
import MediaLightbox from '~/components/ui/MediaLightbox.vue'
import { nomineeInitials, nomineeName, nomineeSub, nomineeTint } from '~/utils/nominee'
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

// back after a first ballot: only what was skipped is still to do
const cats = computed<Nomination[]>(() =>
  props.mode === 'vote' && props.voted ? props.award.nominations.filter((n) => !props.cast[n.id]) : props.award.nominations,
)
const reviewing = computed(() => props.mode === 'vote')
const total = computed(() => cats.value.length + (reviewing.value ? 1 : 0))
const step = ref(0)
const dir = ref(1)
watch(total, (t) => { if (step.value > t - 1) step.value = Math.max(0, t - 1) })
// a ballot just went in: start again from the first category still open
watch(() => Object.keys(props.cast).length, () => { dir.value = -1; step.value = 0 })
const cat = computed(() => cats.value[step.value])
const onReview = computed(() => reviewing.value && step.value === cats.value.length)
const results = computed<Result[]>(() => (cat.value && props.mode === 'results' ? resultsOf(props.tally, cat.value) : []))
const numbers = computed(() => !props.award.hideCounts)
const winners = computed(() => results.value.filter((r) => r.top))
const ordered = computed<Nominee[]>(() => (props.mode === 'results' ? results.value.map((r) => r.nominee) : cat.value?.nominees ?? []))
const resultOf = (id: string) => results.value.find((r) => r.nominee.id === id)

const root = ref<HTMLElement | null>(null)
function go(i: number, focus = true) {
  const to = Math.min(Math.max(0, i), total.value - 1)
  if (to === step.value) return
  dir.value = to > step.value ? 1 : -1
  step.value = to
  if (focus) nextTick(() => root.value?.querySelector<HTMLElement>('[data-step-focus]')?.focus({ preventScroll: true }))
  const top = root.value?.getBoundingClientRect().top ?? 0
  if (top < 0 || top > innerHeight * 0.5) root.value?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
}
// "Start voting" in the masthead: bring the ballot up, the current step in focus
function start() {
  root.value?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
  root.value?.querySelector<HTMLElement>('[data-step-focus]')?.focus({ preventScroll: true })
}
defineExpose({ go, start })

let advance: ReturnType<typeof setTimeout> | undefined
function pick(n: Nominee) {
  const c = cat.value
  if (!c || props.mode !== 'vote' || props.cast[c.id]) return
  const first = !props.shown[c.id]
  emit('pick', c.id, n.id)
  // the first pick in a category moves on by itself; changing a pick does not
  clearTimeout(advance)
  if (first) advance = setTimeout(() => go(step.value + 1), 420)
}
function onKey(e: KeyboardEvent, i: number) {
  const list = ordered.value
  if ((e.key === ' ' || e.key === 'Enter') && list[i]) { e.preventDefault(); pick(list[i]); return }
  const d = ({ ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 } as Record<string, number>)[e.key]
  if (!d) return
  e.preventDefault()
  const next = (i + d + list.length) % list.length
  root.value?.querySelectorAll<HTMLElement>('.ap-nom')[next]?.focus()
}

const viewing = ref<{ src?: string; url?: string; title: string } | null>(null)
const pickedName = (c: Nomination) => {
  const id = props.shown[c.id]
  const n = c.nominees.find((x) => x.id === id)
  return n ? nomineeName(n) : ''
}
const status = (c: Nomination) =>
  props.mode === 'results' ? '' : props.cast[c.id] ? 'Your vote is in' : props.shown[c.id] ? 'Picked' : props.mode === 'vote' ? 'Pick one' : ''
const nextLabel = computed(() => {
  if (!cat.value) return ''
  if (!reviewing.value) return step.value < total.value - 1 ? 'Next category' : ''
  if (step.value === cats.value.length - 1) return 'Check your picks'
  return props.shown[cat.value.id] ? 'Next category' : 'Skip'
})
</script>

<template>
  <section id="vote" ref="root" class="ap-ballot env-stepper" aria-labelledby="ballot-h">
    <div class="ap-ballot-h">
      <h2 id="ballot-h">{{ mode === 'results' ? 'The winners' : mode === 'locked' ? 'The nominees' : voted ? 'Still open to you' : 'Your votes' }}</h2>
      <p v-if="note && mode === 'locked'">{{ note }}</p>
      <p v-if="mode === 'vote' && !voted">Pick one nominee in each category. Skip any you like: they stay open until voting closes.</p>
      <p v-else-if="mode === 'vote'">Your picks are in. The categories you skipped stay open until voting closes.</p>
      <p v-else-if="mode === 'results'">{{ numbers ? 'Every category, most votes first.' : 'Every category, in finishing order. The host kept the counts private.' }}</p>
    </div>

    <!-- the steps: one dash each, the review last; every dash goes to its step -->
    <nav class="env-steps" aria-label="Categories">
      <button
        v-for="(c, i) in cats"
        :key="c.id"
        type="button"
        :class="{ on: !!shown[c.id] || (mode === 'results'), cur: i === step }"
        :aria-current="i === step ? 'step' : undefined"
        :aria-label="`Category ${i + 1}: ${c.title}${shown[c.id] ? ', picked' : ''}`"
        @click="go(i)"
      />
      <button v-if="reviewing" type="button" class="rev" :class="{ cur: onReview }" :aria-current="onReview ? 'step' : undefined" aria-label="Check your picks" @click="go(cats.length)" />
    </nav>

    <div class="env-stage">
      <Transition :name="dir > 0 ? 'env-next' : 'env-prev'" mode="out-in">
        <!-- one category -->
        <div v-if="cat && !onReview" :key="cat.id" class="ap-cat">
          <div class="ap-cat-h">
            <h3 tabindex="-1" data-step-focus><small>Category {{ step + 1 }} of {{ cats.length }}</small>{{ cat.title }}</h3>
            <span class="lbl" :class="{ ok: !!shown[cat.id] }">
              <template v-if="mode === 'results'">{{ numbers ? `${results.reduce((s, r) => s + r.votes, 0)} votes` : winners.length > 1 ? 'Tied' : '' }}</template>
              <template v-else>{{ status(cat) }}</template>
            </span>
          </div>
          <div class="ap-noms" :role="mode === 'results' ? 'list' : 'radiogroup'" :aria-labelledby="'ballot-h'">
            <div
              v-for="(n, i) in ordered"
              :key="n.id"
              class="ap-nom"
              :class="{ win: resultOf(n.id)?.top }"
              :role="mode === 'results' ? 'listitem' : 'radio'"
              :tabindex="mode === 'results' ? -1 : (shown[cat.id] ? shown[cat.id] === n.id : i === 0) ? 0 : -1"
              :aria-checked="mode === 'results' ? undefined : shown[cat.id] === n.id"
              :aria-disabled="mode !== 'vote' || !!cast[cat.id] ? 'true' : undefined"
              @click="pick(n)"
              @keydown="onKey($event, i)"
            >
              <span v-if="n.kind === 'media'" class="ap-media art">
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
                  <img v-if="n.kind === 'channel' && n.channel.avatar" class="av env-avimg" :src="n.channel.avatar" alt="" loading="lazy">
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
              <!-- after the ceremony: the place, the bar and the share, unless the host kept the counts -->
              <span v-if="mode === 'results'" class="env-res">
                <b>{{ resultOf(n.id)?.top ? (winners.length > 1 ? 'Tied' : 'Winner') : `#${i + 1}` }}</b>
                <template v-if="numbers">
                  <i :style="{ '--p': `${resultOf(n.id)?.pct ?? 0}%` }" /><span class="tnum">{{ resultOf(n.id)?.pct ?? 0 }}%</span>
                </template>
              </span>
              <span v-else class="tick" />
            </div>
          </div>
        </div>

        <!-- the check before the one sign-in -->
        <div v-else-if="onReview" key="review" class="ap-cat env-review">
          <div class="ap-cat-h"><h3 tabindex="-1" data-step-focus><small>Last step</small>Check your picks</h3></div>
          <ol class="env-picks">
            <li v-for="(c, i) in cats" :key="c.id">
              <span class="env-pk-t">{{ c.title }}</span>
              <b v-if="shown[c.id]">{{ pickedName(c) }}</b>
              <span v-else class="env-pk-skip">Skipped, stays open</span>
              <button type="button" class="link" @click="go(i)">{{ shown[c.id] ? 'Change' : 'Pick' }}</button>
            </li>
          </ol>
          <p class="env-note">Each pick is final once it is in. One ballot per Twitch or Kick account.</p>
          <div class="env-send">
            <SignInButtons
              v-if="!signedIn"
              label="Vote with"
              :disabled="!pickedCount"
              @choose="emit('submit', $event)"
            />
            <button v-else class="btn p" type="button" :disabled="!pickedCount" @click="emit('submit')">
              {{ pickedCount ? `Submit ${pickedCount} ${pickedCount === 1 ? 'vote' : 'votes'}` : 'Pick at least one' }}
            </button>
          </div>
          <p v-if="voteError" class="env-err" role="alert">{{ voteError }}</p>
        </div>
      </Transition>
    </div>

    <!-- the bar: where you are, and the way on -->
    <div class="ap-bar env-bar">
      <div class="ap-bar-in">
        <div class="ap-prog" aria-hidden="true"><i v-for="c in cats" :key="c.id" :class="{ on: !!shown[c.id] || mode === 'results' }" /></div>
        <p aria-live="polite">
          <template v-if="mode === 'vote'"><b class="tnum">{{ cats.filter((c) => shown[c.id]).length }} of {{ cats.length }}</b> picked<span class="env-hide-sm"> · skipped ones stay open</span></template>
          <template v-else><b class="tnum">{{ step + 1 }} of {{ cats.length }}</b> categories</template>
        </p>
        <div class="env-nav">
          <button class="btn sm" type="button" :disabled="step === 0" @click="go(step - 1)">Back</button>
          <button v-if="nextLabel" class="btn sm" :class="!reviewing || shown[cat?.id ?? ''] ? 'p' : ''" type="button" @click="go(step + 1)">{{ nextLabel }}</button>
        </div>
      </div>
    </div>

    <MediaLightbox
      :open="!!viewing"
      :src="viewing?.src ?? ''"
      :url="viewing?.url ?? ''"
      :title="viewing?.title ?? ''"
      @close="viewing = null"
    />
  </section>
</template>
