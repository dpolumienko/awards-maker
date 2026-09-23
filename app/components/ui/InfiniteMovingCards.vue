<script setup lang="ts" generic="T">
// Port of "Infinite Moving Cards" from 21st.dev.
// Source: https://21st.dev/@nexus-ui/components/infinite-moving-cards
// React + Framer Motion original ported to Vue. The loop algorithm, speed map,
// wrap logic, ResizeObserver measuring and hover pause are the author's.
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { prefersReducedMotion } from '~/composables/useReveal'

const {
  items,
  direction = 'left',
  speed = 'normal',
  pauseOnHover = true,
  gap = 16,
  showGradientMask = true,
} = defineProps<{
  items: T[]
  direction?: 'left' | 'right'
  speed?: 'slow' | 'normal' | 'fast'
  pauseOnHover?: boolean
  gap?: number
  showGradientMask?: boolean
}>()

const SPEED_PX_PER_SEC = { slow: 26, normal: 44, fast: 74 }

const viewport = ref<HTMLElement | null>(null)
const track = ref<HTMLElement | null>(null)
const x = ref(0)
const singleWidth = ref(0)
const hovered = ref(false)
const rendered = computed(() => [...items, ...items])

let raf = 0
let last = 0
let observer: ResizeObserver | null = null

function measure() {
  if (!track.value) return
  singleWidth.value = track.value.scrollWidth / 2
  if (direction === 'right' && x.value === 0) x.value = -singleWidth.value
}

function frame(now: number) {
  const delta = last ? now - last : 16
  last = now
  raf = requestAnimationFrame(frame)
  if (singleWidth.value <= 0 || (pauseOnHover && hovered.value)) return

  const velocity = SPEED_PX_PER_SEC[speed] * (delta / 1000)
  let next = x.value + (direction === 'left' ? -velocity : velocity)
  if (direction === 'left' && next <= -singleWidth.value) next += singleWidth.value
  if (direction === 'right' && next >= 0) next -= singleWidth.value
  x.value = next
}

onMounted(() => {
  measure()
  observer = new ResizeObserver(measure)
  if (viewport.value) observer.observe(viewport.value)
  if (track.value) observer.observe(track.value)
  if (!prefersReducedMotion()) raf = requestAnimationFrame(frame)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  observer?.disconnect()
})

watch(() => items.length, () => requestAnimationFrame(measure))
</script>

<template>
  <div
    class="relative w-full"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
    @focusin="hovered = true"
    @focusout="hovered = false"
  >
    <div ref="viewport" class="overflow-hidden">
      <div
        ref="track"
        class="flex w-max py-1 will-change-transform"
        :style="{ transform: `translate3d(${x}px,0,0)`, gap: `${gap}px` }"
      >
        <!-- The rail is decorative motion: its links repeat content that also exists
             in a static section, so nothing here takes keyboard focus. -->
        <div v-for="(item, i) in rendered" :key="i" class="shrink-0" :aria-hidden="i >= items.length" :inert="i >= items.length || undefined">
          <slot :item="item" :index="i" />
        </div>
      </div>
    </div>
    <template v-if="showGradientMask">
      <span aria-hidden="true" class="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-canvas via-canvas/70 to-transparent" />
      <span aria-hidden="true" class="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-canvas via-canvas/70 to-transparent" />
    </template>
  </div>
</template>
