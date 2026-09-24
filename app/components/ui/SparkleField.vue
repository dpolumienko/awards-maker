<script setup lang="ts">
// Motes drifting up through the stage light, dimming as they rise so the field
// dissolves before it reaches the top edge. Not from the 21st component - the
// sparkles util behind it is not published, so this is ours.
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { prefersReducedMotion } from '~/composables/useReveal'

const { density = 90, seedFrom = 0.65 } = defineProps<{
  density?: number
  /** Fraction of the height below which motes are born, 0 = top, 1 = bottom. */
  seedFrom?: number
}>()

const canvas = ref<HTMLCanvasElement | null>(null)
let raf = 0
let ro: ResizeObserver | null = null

onMounted(() => {
  const el = canvas.value
  if (!el || prefersReducedMotion()) return
  const ctx = el.getContext('2d')!
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  let w = 0
  let h = 0

  type Mote = { x: number; y: number; r: number; vy: number; drift: number; a: number; tw: number }
  let motes: Mote[] = []

  const spawn = (initial = false): Mote => ({
    x: Math.random() * w,
    // on first paint spread them through the whole rise, afterwards start low
    y: initial ? Math.random() * h : h * seedFrom + Math.random() * h * (1 - seedFrom),
    r: Math.random() * 1.6 + 0.4,
    vy: Math.random() * 0.28 + 0.08,
    drift: (Math.random() - 0.5) * 0.12,
    a: Math.random() * 0.7 + 0.25,
    tw: Math.random() * Math.PI * 2,
  })

  const size = () => {
    w = el.clientWidth
    h = el.clientHeight
    el.width = w * dpr
    el.height = h * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    motes = Array.from({ length: density }, () => spawn(true))
  }

  const draw = () => {
    raf = requestAnimationFrame(draw)
    ctx.clearRect(0, 0, w, h)
    // the palette's light colour, read each frame so a palette switch recolours the dust
    const mote = `rgb(${getComputedStyle(document.documentElement).getPropertyValue('--gold-text').trim() || '239 201 122'})`
    for (let i = 0; i < motes.length; i++) {
      const m = motes[i]!
      m.y -= m.vy
      m.x += m.drift
      m.tw += 0.03
      if (m.y < -2) motes[i] = spawn()
      // bright near the floor, gone by the ceiling
      const rise = 1 - m.y / h
      const fade = Math.max(0, 1 - rise * rise) * (0.65 + Math.sin(m.tw) * 0.35)
      ctx.globalAlpha = m.a * fade
      ctx.fillStyle = mote
      ctx.beginPath()
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  size()
  ro = new ResizeObserver(size)
  ro.observe(el)
  raf = requestAnimationFrame(draw)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  ro?.disconnect()
})
</script>

<template>
  <canvas ref="canvas" class="pointer-events-none block h-full w-full" aria-hidden="true" />
</template>
