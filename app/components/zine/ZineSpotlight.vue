<script setup lang="ts">
// The Fanzine's light: a follow-spot hung under the masthead, throwing a cool,
// nearly white beam down to a pool where the pointer is. It only adds light, and only a
// little - the page reads as it does without it (review 2026-10-06). Fixed to the
// viewport, so the lamp rides along as the page scrolls; with no pointer (touch,
// or a still mouse) it sweeps on its own. Chosen from the backdrop board,
// outputs/fanzine-backgrounds-2026-10-06.
//
// Two layers. The light is drawn solid on the canvas and made faint by the
// canvas's own opacity and blend (.zine-spot in assets/css/zine.css), so the beam
// and the pool merge without a seam where they overlap. The lamp is an SVG on
// top, never blended, so it stays a solid object.
//
// A switch right of the lamp turns it off; off, the lamp still hangs there,
// dark and still. The
// choice is kept in this browser. Phones get no spotlight: no pointer to follow,
// and no margin to hang the lamp in.
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

const canvas = ref<HTMLCanvasElement | null>(null)
const lamp = ref<SVGSVGElement | null>(null)
const head = ref<SVGGElement | null>(null)
const toggle = ref<HTMLButtonElement | null>(null)
// the beam's colour lives in CSS (--spot in assets/css/zine.css), one per paper
const OFF_KEY = 'am-spot-off'
const lit = ref(true)
const IDLE_AFTER = 4 // seconds without a pointer move before the spot sweeps
const PIVOT = 24 // px below the masthead where the lamp turns
// It hangs in the right-hand margin, not over the middle of the page: the lamp is
// solid, and in the middle it covered whatever text scrolled under it.
const FROM_RIGHT = 56
let stop = () => {}

onMounted(() => {
  const c = canvas.value!
  const ctx = c.getContext('2d')!
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches
  let W = 0, H = 0, top = 0
  let x = -1, y = -1
  let mx = -1, my = -1, moved = -Infinity
  let raf = 0
  let light = '235 241 255'
  const phone = matchMedia('(max-width: 767px)')

  try {
    lit.value = localStorage.getItem(OFF_KEY) !== '1'
  } catch {
    /* no storage: the light starts on */
  }
  watch(lit, (on) => {
    try {
      if (on) localStorage.removeItem(OFF_KEY)
      else localStorage.setItem(OFF_KEY, '1')
    } catch {
      /* private mode: the choice lasts for this page */
    }
    if (still) draw(0)
  })
  // the paper decides the beam's colour; read again when Fanzine and Night swap
  const readLight = () => (light = getComputedStyle(c).getPropertyValue('--spot').trim() || light)
  const inks = new MutationObserver(() => {
    readLight()
    if (still) draw(0)
  })
  inks.observe(document.documentElement, { attributes: true, attributeFilter: ['data-ink'] })

  function size() {
    const dpr = Math.min(devicePixelRatio || 1, 2)
    W = innerWidth
    H = innerHeight
    c.width = W * dpr
    c.height = H * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    // the masthead is sticky, so its bottom edge is where the rig hangs on every scroll
    top = document.querySelector('.site-header')?.getBoundingClientRect().height ?? 0
    lamp.value!.style.top = `${top}px`
    toggle.value!.style.top = `${top + 16}px`
    readLight()
  }

  function draw(t: number) {
    const idle = mx < 0 || t - moved > IDLE_AFTER
    const tx = still ? W * 0.62 : idle ? W * (0.5 + 0.34 * Math.sin(t * 0.45)) : mx
    const ty = still ? top + (H - top) * 0.42 : idle ? top + (H - top) * (0.5 + 0.18 * Math.sin(t * 0.7)) : Math.max(top + 120, my)
    if (x < 0 || still) {
      x = tx
      y = ty
    }
    x += (tx - x) * 0.32
    y += (ty - y) * 0.32

    const R = Math.min(170, W * 0.24)
    const ry = R * 0.42
    const px = W - FROM_RIGHT, py = top + PIVOT
    const a = Math.atan2(y - py, x - px)
    // the beam leaves from the lens, a little way down the can
    const sx = px + Math.cos(a) * 10, sy = py + Math.sin(a) * 10

    ctx.clearRect(0, 0, W, H)
    // off, the lamp hangs still, pointing straight down
    head.value!.setAttribute('transform', lit.value ? `rotate(${(a * 180) / Math.PI - 90})` : 'rotate(0)')
    if (!lit.value || phone.matches) return
    const beam = light.split(/\s+/).join(',')
    // the pool: solid in the middle, soft at the rim
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(1, ry / R)
    const pool = ctx.createRadialGradient(0, 0, R * 0.55, 0, 0, R * 1.2)
    pool.addColorStop(0, `rgba(${beam},1)`)
    pool.addColorStop(1, `rgba(${beam},0)`)
    ctx.fillStyle = pool
    ctx.beginPath()
    ctx.arc(0, 0, R * 1.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    // the beam, fainter than the pool and ending inside its solid middle, drawn
    // under it - so the two read as one light and the pool never brightens twice
    ctx.globalCompositeOperation = 'destination-over'
    const cone = ctx.createLinearGradient(sx, sy, x, y)
    cone.addColorStop(0, `rgba(${beam},0.15)`)
    cone.addColorStop(1, `rgba(${beam},0.45)`)
    ctx.fillStyle = cone
    ctx.beginPath()
    ctx.moveTo(sx - 9, sy)
    ctx.lineTo(sx + 9, sy)
    ctx.lineTo(x + R * 0.55, y)
    ctx.lineTo(x - R * 0.55, y)
    ctx.closePath()
    ctx.fill()
    ctx.globalCompositeOperation = 'source-over'
  }

  function frame(ms: number) {
    draw(ms / 1000)
    raf = requestAnimationFrame(frame)
  }
  function move(e: PointerEvent) {
    mx = e.clientX
    my = e.clientY
    moved = performance.now() / 1000
  }
  function resize() {
    size()
    if (still) draw(0)
  }

  size()
  addEventListener('resize', resize)
  if (still) draw(0)
  else {
    addEventListener('pointermove', move, { passive: true })
    addEventListener('pointerdown', move, { passive: true })
    raf = requestAnimationFrame(frame)
  }
  stop = () => {
    cancelAnimationFrame(raf)
    removeEventListener('resize', resize)
    removeEventListener('pointermove', move)
    removeEventListener('pointerdown', move)
    inks.disconnect()
  }
})
onBeforeUnmount(() => stop())
</script>

<template>
  <!-- under the masthead and every sticky bar that comes later in the page, over the content -->
  <canvas ref="canvas" aria-hidden="true" class="zine-spot pointer-events-none fixed inset-0 z-30 h-full w-full" />
  <!-- the lamp: the hanger stays put, the can turns to follow its beam -->
  <svg ref="lamp" aria-hidden="true" class="zine-lamp pointer-events-none fixed z-30" :class="!lit && 'is-off'" viewBox="-30 -24 60 60" width="60" height="60">
    <rect class="zine-lamp-rig" x="-2" y="-24" width="4" height="22" />
    <g ref="head">
      <path class="zine-lamp-can" d="M-13 -22H13L17 8H-17Z" />
      <rect class="zine-lamp-lens" x="-15" y="6" width="30" height="5" />
    </g>
    <circle class="zine-lamp-rig" r="4" />
  </svg>
  <button
    ref="toggle"
    type="button"
    class="zine-spot-switch fixed z-30"
    :aria-pressed="lit"
    :aria-label="lit ? 'Turn the spotlight off' : 'Turn the spotlight on'"
    :title="lit ? 'Turn the spotlight off' : 'Turn the spotlight on'"
    @click="lit = !lit"
  >
    <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><path d="M12 3v8M6.4 6.6a8 8 0 1 0 11.2 0" /></svg>
  </button>
</template>
