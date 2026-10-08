<script lang="ts">
// each loop with how far past one lap its path runs, for the dash length below
const LOOPS = [
  { d: 'M14 52 C 10 20, 140 4, 262 16 C 300 22, 302 66, 236 76 C 150 88, 26 82, 10 54 C 4 38, 36 20, 96 14', laps: 1.3 },
  { d: 'M280 30 C 250 6, 60 4, 18 30 C -6 52, 40 84, 150 84 C 250 84, 300 64, 288 36 C 282 22, 250 14, 200 12', laps: 1.3 },
  { d: 'M20 50 C 14 18, 150 6, 270 18 C 306 26, 296 70, 230 78 C 140 90, 18 84, 12 56 C 8 30, 90 10, 180 10 C 280 12, 304 44, 270 66 C 240 86, 120 88, 40 74', laps: 2.3 },
  { d: 'M30 66 C 10 40, 110 2, 240 6 C 300 8, 300 40, 262 60 C 200 90, 60 96, 22 72 C 6 60, 30 36, 80 24', laps: 1.4 },
  { d: 'M16 18 C 100 8, 200 8, 284 14 C 292 40, 290 60, 282 78 C 200 84, 100 86, 18 80 C 10 60, 10 40, 22 14 L 60 12', laps: 1.35 },
]
// riso Fluorescent Pink, Orange and Green. Not blue: that is the press's own, and
// a circle in it vanished on the blue winner panel - as did purple.
const INKS = ['255 72 176', '255 108 47', '0 169 92']
export const PEN_LOOKS = LOOPS.length * INKS.length
/** Which loop and ink a seed draws - shared, so a scene can paint other things in the pen's ink. */
export function penOf(seed: number) {
  return { loop: seed % LOOPS.length, ink: INKS[Math.floor(seed / LOOPS.length) % INKS.length]! }
}
</script>

<script setup lang="ts">
// The Fanzine's pen: a hand circle drawn around whatever was chosen - your pick
// on the ballot, the winner on stream and on the results. Outside the Fanzine,
// or while `on` is false, it is just its text.
//
// No two circles alike (review 2026-10-06): every time it is drawn the pen
// takes one of five hand-drawn loops and one of three riso inks at random. Picked
// on the client, after mount - a random choice rendered on the server would not
// match the browser's and break hydration, so the first paint is loop 0 in pink.
//
// The stroke is non-scaling, so its dash runs in screen pixels, not in path
// units: `pathLength` would draw a big circle only part of the way round (seen
// in the concept board). The circle's length is measured from the box it wraps.
import { nextTick, onMounted, ref, watch } from 'vue'
import { useVersion } from '~/composables/useVersion'

// `seed` makes the pick shared: two pens given the same seed draw the same loop
// in the same ink - the landing's ballot and its winner panel (review 2026-10-06)
const { on = true, as = 'span', seed } = defineProps<{ on?: boolean; as?: string; seed?: number }>()
const { isZine } = useVersion()
const box = ref<HTMLElement | null>(null)
const len = ref(0)

const loop = ref(0)
const ink = ref(INKS[0]!)
const mounted = ref(false)
function pick() {
  const p = penOf(seed ?? Math.floor(Math.random() * PEN_LOOKS))
  loop.value = p.loop
  ink.value = p.ink
}
watch(
  () => seed,
  () => {
    if (!mounted.value) return
    pick()
    nextTick(measure)
  },
)
onMounted(() => {
  mounted.value = true
  pick()
  if (on && isZine.value) nextTick(measure)
})

function measure() {
  const r = box.value?.getBoundingClientRect()
  if (!r?.width) return
  // the svg is 118% x 160% of the text; the path loops about a quarter past its start
  const a = (r.width * 1.18) / 2
  const b = (r.height * 1.6) / 2
  len.value = Math.ceil(Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b))) * LOOPS[loop.value]!.laps)
}
watch(
  () => on && isZine.value,
  (drawn) => {
    if (!drawn) return
    // a fresh circle each time a pick is made; the first one waits for mount
    if (mounted.value) pick()
    nextTick(measure)
  },
  { immediate: true, flush: 'post' },
)
</script>

<template>
  <component :is="as" ref="box" class="zine-pen" :style="{ '--pen': ink, ...(len ? { '--len': `${len}px` } : {}) }">
    <slot />
    <svg
      v-if="isZine && on"
      :key="`${loop}-${ink}`"
      class="zine-pen-line"
      :class="len && 'is-inked'"
      viewBox="0 0 300 90"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        vector-effect="non-scaling-stroke"
        :d="LOOPS[loop]!.d"
      />
    </svg>
  </component>
</template>
