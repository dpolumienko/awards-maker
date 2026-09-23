<script setup lang="ts">
// Port of "Snap Carousel" from 21st.dev.
// Source: https://21st.dev/@ddoemonn/components/snap-carousel
// The original is React + Motion, one slide per view. Ported to Vue with GSAP
// (already the animation engine here) and one addition: `perView`, so three
// cards share a row on desktop and the block stays one row tall instead of a
// six-card wall. The physics are the author's - drag, then a flick projected by
// velocity and clamped to one slide past the anchor, so a hard swipe never
// throws the row across the whole set.
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useGsap, prefersReducedMotion } from '~/composables/useReveal'
import UiIcon from './UiIcon.vue'

const {
  label,
  count,
  gap = 16,
  peek = 32,
  momentum = 0.14,
  maxFlick = 1,
} = defineProps<{
  label: string
  count: number
  gap?: number
  peek?: number
  momentum?: number
  maxFlick?: number
}>()

const viewport = ref<HTMLElement | null>(null)
const track = ref<HTMLElement | null>(null)
const index = ref(0)
const dragging = ref(false)
const width = ref(0)
const perView = ref(1)

const slideWidth = computed(() =>
  Math.max(120, (width.value - gap * (perView.value - 1)) / perView.value),
)
const step = computed(() => slideWidth.value + gap)
const maxIndex = computed(() => Math.max(0, count - perView.value))
const pages = computed(() => maxIndex.value + 1)

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))
let x = 0

function paint(value: number) {
  x = value
  if (track.value) track.value.style.transform = `translate3d(${value}px,0,0)`
}

/** Snap home. Velocity shortens the ride, the way a flick should feel. */
function glide(to: number, velocity = 0) {
  const { gsap } = useGsap()
  gsap.killTweensOf(paintProxy)
  if (prefersReducedMotion()) return paint(to)
  paintProxy.v = x
  gsap.to(paintProxy, {
    v: to,
    duration: clamp(0.75 - Math.abs(velocity) / 6000, 0.35, 0.75),
    ease: 'expo.out',
    onUpdate: () => paint(paintProxy.v),
  })
}
const paintProxy = { v: 0 }

function goTo(next: number, velocity = 0) {
  index.value = clamp(Math.round(next), 0, maxIndex.value)
  glide(-index.value * step.value, velocity)
}
const move = (dir: 1 | -1) => goTo(index.value + dir)

/** Where the row should land, given where it is and how hard it was thrown. */
function pick(velocity: number) {
  if (!step.value) return index.value
  const at = -x / step.value
  const anchor = clamp(Math.round(at), 0, maxIndex.value)
  const projected = at - (velocity * momentum) / step.value
  return clamp(clamp(Math.round(projected), anchor - maxFlick, anchor + maxFlick), 0, maxIndex.value)
}

// drag, with pointer capture so a fast throw does not escape the element
let startX = 0
let startTx = 0
let startAt = 0
let lastX = 0
let lastAt = 0

function onDown(e: PointerEvent) {
  if (count <= perView.value || e.button !== 0) return
  const { gsap } = useGsap()
  gsap.killTweensOf(paintProxy)
  dragging.value = true
  startX = lastX = e.clientX
  startAt = lastAt = e.timeStamp
  startTx = x
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}
function onMove(e: PointerEvent) {
  if (!dragging.value) return
  const dx = e.clientX - startX
  // past either end the row still moves, but heavily damped - the rubber band
  const raw = startTx + dx
  const min = -maxIndex.value * step.value
  const over = raw > 0 ? raw : raw < min ? raw - min : 0
  paint(over ? (raw > 0 ? over * 0.35 : min + (raw - min) * 0.35) : raw)
  lastX = e.clientX
  lastAt = e.timeStamp
}
function onUp(e: PointerEvent) {
  if (!dragging.value) return
  dragging.value = false
  const dt = Math.max(1, e.timeStamp - lastAt || e.timeStamp - startAt)
  const velocity = ((lastX - startX) / dt) * 1000
  goTo(pick(velocity), velocity)
}

function onKey(e: KeyboardEvent) {
  const keys: Record<string, () => void> = {
    ArrowRight: () => move(1),
    ArrowLeft: () => move(-1),
    Home: () => goTo(0),
    End: () => goTo(maxIndex.value),
  }
  if (!keys[e.key]) return
  e.preventDefault()
  keys[e.key]!()
}

let ro: ResizeObserver | undefined
function measure() {
  if (!viewport.value) return
  width.value = viewport.value.clientWidth - peek * 2
  perView.value = window.innerWidth >= 1024 ? 3 : window.innerWidth >= 640 ? 2 : 1
  index.value = clamp(index.value, 0, maxIndex.value)
  paint(-index.value * step.value)
}
onMounted(() => {
  measure()
  ro = new ResizeObserver(measure)
  if (viewport.value) ro.observe(viewport.value)
})
onBeforeUnmount(() => ro?.disconnect())
</script>

<template>
  <div>
    <div
      ref="viewport"
      tabindex="0"
      role="group"
      aria-roledescription="carousel"
      :aria-label="label"
      class="relative overflow-hidden rounded-card py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
      :style="{
        paddingInline: peek + 'px',
        maskImage: `linear-gradient(to right, transparent 0, #000 ${peek}px, #000 calc(100% - ${peek}px), transparent 100%)`,
        WebkitMaskImage: `linear-gradient(to right, transparent 0, #000 ${peek}px, #000 calc(100% - ${peek}px), transparent 100%)`,
      }"
      @keydown="onKey"
    >
      <div
        ref="track"
        class="flex items-stretch touch-pan-y"
        :class="count > perView ? (dragging ? 'cursor-grabbing' : 'cursor-grab') : ''"
        :style="{ gap: gap + 'px' }"
        @pointerdown="onDown"
        @pointermove="onMove"
        @pointerup="onUp"
        @pointercancel="onUp"
      >
        <div
          v-for="i in count"
          :key="i"
          role="group"
          aria-roledescription="slide"
          :aria-label="`${i} of ${count}`"
          class="shrink-0 select-none transition-opacity duration-500 ease-gala"
          :class="i - 1 >= index && i - 1 < index + perView ? 'opacity-100' : 'opacity-50'"
          :style="{ width: slideWidth + 'px' }"
        >
          <slot name="slide" :i="i - 1" />
        </div>
      </div>
    </div>

    <div class="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-3" :style="{ paddingInline: peek + 'px' }">
      <!-- position, as a row of bars: the active one stretches -->
      <span class="flex min-w-0 flex-wrap items-center gap-1.5">
        <button
          v-for="p in pages"
          :key="p"
          type="button"
          class="grid h-6 min-w-[24px] place-items-center rounded-btn px-1"
          :aria-label="`Go to slide ${p}`"
          :aria-current="p - 1 === index ? 'true' : undefined"
          @click="goTo(p - 1)"
        >
          <span
            class="block h-1 w-7 origin-left rounded-pill transition-[transform,background-color] duration-500 ease-gala"
            :class="p - 1 === index ? 'scale-x-100 bg-gold' : 'scale-x-[0.43] bg-hair2'"
          />
        </button>
      </span>
      <span class="flex items-center gap-2">
        <button
          v-for="d in ([-1, 1] as const)"
          :key="d"
          type="button"
          class="grid h-10 w-10 place-items-center rounded-btn border border-hair text-ink-2 transition-colors hover:border-gold hover:text-ink disabled:opacity-30 disabled:hover:border-hair"
          :disabled="d === -1 ? index === 0 : index >= maxIndex"
          :aria-label="d === -1 ? 'Previous awards' : 'Next awards'"
          @click="move(d)"
        >
          <UiIcon :name="d === -1 ? 'chevron-left' : 'chevron-right'" />
        </button>
      </span>
    </div>
    <span aria-live="polite" class="sr-only">Slide {{ index + 1 }} of {{ pages }}</span>
  </div>
</template>
