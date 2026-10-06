<script setup lang="ts">
// The Fanzine cover's backdrop: rubber stamps. Click the bare paper of the cover
// and it gets stamped - VOTED, NOMINATED, OFFICIAL BALLOT, COUNTED, now and then a
// pink WINNER - at a hand-held angle, the ink a little uneven. Left alone, the
// cover stamps itself. Picked from the backdrop board (review 2026-10-06,
// outputs/fanzine-backgrounds-2026-10-06, variant I). Sits behind the cover's
// content and lands only on bare paper, so no stamp is printed over type.
import { onBeforeUnmount, onMounted, ref } from 'vue'

interface Stamp { x: number; y: number; hw: number; word: string; seed: number; at: number }

const WORDS = ['Voted', 'Nominated', 'Official ballot', 'Counted', 'Voted', 'Nominated', 'Winner']
const KEEP = 12
const FONT = "900 expanded 22px Anybody, 'Arial Black', sans-serif"
const IDLE_AFTER = 2500 // ms without a click before the cover stamps itself
const EVERY = 1600
// anything that is reading matter or a control is not bare paper
const NOT_PAPER = 'a,button,h1,h2,p,ul,article,.zl-stand'

const canvas = ref<HTMLCanvasElement | null>(null)
let stop = () => {}

// a small seeded random, so a stamp's grain and angle stay put on every redraw
function rand(seed: number) {
  let s = seed
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

onMounted(() => {
  const c = canvas.value!
  const host = c.parentElement!
  const ctx = c.getContext('2d')!
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches
  const stamps: Stamp[] = []
  let W = 0, H = 0, raf = 0, last = performance.now(), timer = 0, seen = false

  const ink = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim().split(/\s+/).join(',')

  function size() {
    const dpr = Math.min(devicePixelRatio || 1, 2)
    W = host.clientWidth
    H = host.clientHeight
    c.width = W * dpr
    c.height = H * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    draw()
  }

  function draw() {
    const now = performance.now()
    const blue = ink('--gold-text'), pink = ink('--pink')
    ctx.clearRect(0, 0, W, H)
    let landing = false
    for (const s of stamps) {
      const r = rand(s.seed)
      const age = still ? 1 : (now - s.at) / 140
      const scale = age < 1 ? 1.35 - age * 0.35 : 1
      if (age < 1) landing = true
      const word = s.word.toUpperCase()
      ctx.save()
      ctx.translate(s.x * W, s.y)
      ctx.rotate((r() - 0.5) * 0.4)
      ctx.scale(scale, scale)
      ctx.font = FONT
      const w = ctx.measureText(word).width + 30, h = 44
      ctx.strokeStyle = ctx.fillStyle = `rgba(${s.word === 'Winner' ? pink : blue},0.7)`
      ctx.lineWidth = 3
      ctx.strokeRect(-w / 2, -h / 2, w, h)
      ctx.lineWidth = 1.5
      ctx.strokeRect(-w / 2 + 5, -h / 2 + 5, w - 10, h - 10)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(word, 0, 1)
      // uneven ink: a rubber stamp never prints solid
      ctx.globalCompositeOperation = 'destination-out'
      for (let k = 0; k < 90; k++) ctx.fillRect((r() - 0.5) * w, (r() - 0.5) * h, 1 + r() * 2, 1 + r() * 2)
      ctx.restore()
      ctx.globalCompositeOperation = 'source-over'
    }
    raf = landing ? requestAnimationFrame(draw) : 0
  }

  function stamp(x: number, y: number, word = WORDS[Math.floor(Math.random() * WORDS.length)]!) {
    ctx.font = FONT
    const hw = ctx.measureText(word.toUpperCase()).width / 2 + 26
    stamps.push({ x: x / W, y, hw, word, seed: (Math.random() * 1e9) | 0, at: performance.now() })
    if (stamps.length > KEEP) stamps.shift()
    if (!raf) raf = requestAnimationFrame(draw)
  }

  const bare = (el: Element | null) => !!el && host.contains(el) && !el.closest(NOT_PAPER)

  function click(e: MouseEvent) {
    if (!bare(e.target as Element)) return
    const b = host.getBoundingClientRect()
    last = performance.now()
    stamp(e.clientX - b.left, e.clientY - b.top)
  }

  // A free spot of bare paper, tried at random: the stamp's whole box, tilt
  // included, has to miss the type, the covers and the stamps already there.
  // None found means no stamp.
  function place(word = WORDS[Math.floor(Math.random() * WORDS.length)]!) {
    ctx.font = FONT
    const hw = ctx.measureText(word.toUpperCase()).width / 2 + 26, hh = 34
    const b = host.getBoundingClientRect()
    for (let i = 0; i < 30; i++) {
      const x = hw + Math.random() * (W - 2 * hw), y = hh + Math.random() * (H - 2 * hh)
      const paper = [-1, 0, 1].every((u) => [-1, 0, 1].every((v) => bare(document.elementFromPoint(b.left + x + u * hw, b.top + y + v * hh))))
      const clear = stamps.every((s) => Math.abs(s.x * W - x) > s.hw + hw || Math.abs(s.y - y) > 2 * hh)
      if (paper && clear) {
        stamp(x, y, word)
        return true
      }
    }
    return false
  }
  // left alone, the cover stamps itself; a full sheet loses its oldest stamp
  function auto() {
    if (!seen || performance.now() - last < IDLE_AFTER || place()) return
    stamps.shift()
    draw()
  }

  const io = new IntersectionObserver(([e]) => (seen = !!e?.isIntersecting))
  const ro = new ResizeObserver(size)
  // Fanzine and Night print the stamps in their own inks
  const mo = new MutationObserver(draw)
  io.observe(host)
  ro.observe(host)
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-ink'] })
  host.addEventListener('click', click)
  size()
  // two are on the sheet already
  place('Official ballot')
  place('Voted')
  if (!still) timer = window.setInterval(auto, EVERY)

  stop = () => {
    cancelAnimationFrame(raf)
    clearInterval(timer)
    io.disconnect()
    ro.disconnect()
    mo.disconnect()
    host.removeEventListener('click', click)
  }
})
onBeforeUnmount(() => stop())
</script>

<template>
  <canvas ref="canvas" aria-hidden="true" class="pointer-events-none absolute inset-0 z-0 h-full w-full" />
</template>
