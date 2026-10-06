<script setup lang="ts">
// The Fanzine's one motion: a hand circle in pink drawn around whatever was
// chosen - your pick on the ballot, the winner on stream and on the results.
// Outside the Fanzine, or while `on` is false, it is just its text.
//
// The stroke is non-scaling, so its dash runs in screen pixels, not in path
// units: `pathLength` would draw a big circle only part of the way round (seen
// in the concept board). The circle's length is measured from the box it wraps.
import { nextTick, ref, watch } from 'vue'
import { useVersion } from '~/composables/useVersion'

const { on = true, as = 'span' } = defineProps<{ on?: boolean; as?: string }>()
const { isZine } = useVersion()
const box = ref<HTMLElement | null>(null)
const len = ref(0)

function measure() {
  const r = box.value?.getBoundingClientRect()
  if (!r?.width) return
  // the svg is 118% x 160% of the text; the path loops about a quarter past its start
  const a = (r.width * 1.18) / 2
  const b = (r.height * 1.6) / 2
  len.value = Math.ceil(Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b))) * 1.3)
}
watch(
  () => on && isZine.value,
  (drawn) => drawn && nextTick(measure),
  { immediate: true, flush: 'post' },
)
</script>

<template>
  <component :is="as" ref="box" class="zine-pen" :style="len ? { '--len': `${len}px` } : undefined">
    <slot />
    <svg
      v-if="isZine && on"
      class="zine-pen-line"
      :class="len && 'is-inked'"
      viewBox="0 0 300 90"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        vector-effect="non-scaling-stroke"
        d="M14 52 C 10 20, 140 4, 262 16 C 300 22, 302 66, 236 76 C 150 88, 26 82, 10 54 C 4 38, 36 20, 96 14"
      />
    </svg>
  </component>
</template>
