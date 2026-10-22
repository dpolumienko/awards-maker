<script setup lang="ts">
// The whole awards page, as viewers will see it, from the draft in the builder -
// the same masthead and ballot the published page uses, in a popup. Nothing is
// sent: the picks stay in here and the counts are empty.
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import type { Award } from '~/types/award'
import { emptyTally } from '~/composables/useVoting'
import { accentOf } from '~/utils/accent'
import { formatInZone } from '#shared/time'
import EnvAwardHero from './EnvAwardHero.vue'
import EnvBallot from './EnvBallot.vue'
import '~/assets/css/envelope-builder.css'

const props = defineProps<{ award: Award; open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const show = computed<Award>(() => ({
  ...props.award,
  name: props.award.name.trim() || 'Your awards name',
  description: props.award.description.trim() || 'Your description goes here.',
  nominations: props.award.nominations.filter((n) => n.title.trim() || n.nominees.length),
  slug: props.award.slug || 'your-awards',
}))
const accent = computed(() => accentOf(props.award.look))
const headlineFont = computed(() => (props.award.look?.font ? `'${props.award.look.font}', Archivo, sans-serif` : undefined))
const fmt = (d?: string) => (d ? formatInZone(d, props.award.timezone) : '')
const countdown = computed(() => {
  const diff = props.award.closesAt ? Date.parse(props.award.closesAt) - Date.now() : 0
  if (!(diff > 0)) return null
  return {
    days: String(Math.floor(diff / 86_400_000)).padStart(2, '0'),
    hrs: String(Math.floor((diff % 86_400_000) / 3_600_000)).padStart(2, '0'),
    mins: String(Math.floor((diff % 3_600_000) / 60_000)).padStart(2, '0'),
  }
})
const partners = computed(() => props.award.partners.filter((p) => p.name.trim()))
const nomineeTotal = computed(() => show.value.nominations.reduce((a, n) => a + n.nominees.length, 0))
const picks = reactive<Record<string, string>>({})
const tally = emptyTally()
const ballot = ref<InstanceType<typeof EnvBallot> | null>(null)
const closeBtn = ref<HTMLButtonElement | null>(null)
let last: Element | null = null

watch(
  () => props.open,
  async (o) => {
    if (!import.meta.client) return
    document.documentElement.style.overflow = o ? 'hidden' : ''
    if (o) {
      last = document.activeElement
      await nextTick()
      closeBtn.value?.focus()
    } else (last as HTMLElement | null)?.focus?.()
  },
)
// The page scroll lock must never outlive the popup: a reload of this component while
// it was open (a hot update, a route change) left <html> on overflow:hidden and the
// builder stopped scrolling (Ed, 2026-10-22).
onMounted(() => { if (!props.open) document.documentElement.style.overflow = '' })
onBeforeUnmount(() => { document.documentElement.style.overflow = '' })
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="efp" role="dialog" aria-modal="true" aria-labelledby="efp-h" @click.self="emit('close')" @keydown="onKey">
      <div class="efp-box">
        <div class="efp-bar">
          <b id="efp-h">Full preview</b>
          <span>This is how viewers will see your page. Nothing is published yet.</span>
          <button ref="closeBtn" type="button" class="btn sm" @click="emit('close')">Close</button>
        </div>
        <div class="efp-body">
          <div class="efp-page env-ap shell">
            <EnvAwardHero
              :award="show"
              phase="open"
              state="Voting open"
              :countdown="countdown"
              countdown-label="Voting closes in"
              :partners="partners"
              :nominee-total="nomineeTotal"
              :voters="0"
              :closes="fmt(award.closesAt)"
              :ceremony="fmt(award.ceremonyAt)"
              :share-url="`awards.streamscharts.com/a/${show.slug}`"
              :accent="accent"
              :headline-font="headlineFont"
              @start="ballot?.start?.()"
            />
            <EnvBallot
              v-if="show.nominations.length"
              ref="ballot"
              :award="show"
              :tally="tally"
              mode="vote"
              :shown="picks"
              :cast="{}"
              :voted="false"
              :picked-count="Object.keys(picks).length"
              :signed-in="false"
              vote-error=""
              @pick="(c: string, n: string) => (picks[c] = n)"
              @submit="() => {}"
            />
            <p v-else class="efp-empty">Add a category with two nominees and the voting shows up here.</p>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
