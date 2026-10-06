<script setup lang="ts">
// The Fanzine's light: a follow-spot hung under the masthead, throwing a warm
// beam down to a pool where the pointer is. It only adds light - the page reads
// as it does without it (review 2026-10-06: a dimmed room made everything outside
// the pool unreadable). Multiplied into the paper, added to Night's black
// (.zine-spot in assets/css/zine.css). Fixed to the viewport, so the lamp rides
// along as the page scrolls; with no pointer (touch, or a still mouse) it sweeps
// on its own. Chosen from the backdrop board, outputs/fanzine-backgrounds-2026-10-06.
import { onBeforeUnmount, onMounted, ref } from 'vue'

const canvas = ref<HTMLCanvasElement | null>(null)
// tungsten: the beam's warm yellow, and how strong the pool is at its centre
const WARM = '255,196,72'
const POOL = 0.3
const IDLE_AFTER = 4 // seconds without a pointer move before the spot sweeps
let stop = () => {}

onMounted(() => {
  const c = canvas.value!
  const ctx = c.getContext('2d')!
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches
  let W = 0, H = 0, top = 0
  let x = -1, y = -1
  let mx = -1, my = -1, moved = -Infinity
  let raf = 0

  function size() {
    const dpr = Math.min(devicePixelRatio || 1, 2)
    W = innerWidth
    H = innerHeight
    c.width = W * dpr
    c.height = H * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    // the masthead is sticky, so its bottom edge is where the rig hangs on every scroll
    top = document.querySelector('.site-header')?.getBoundingClientRect().height ?? 0
  }

  function draw(t: number) {
    const idle = mx < 0 || t - moved > IDLE_AFTER
    const tx = still ? W * 0.62 : idle ? W * (0.5 + 0.34 * Math.sin(t * 0.45)) : mx
    const ty = still ? top + (H - top) * 0.42 : idle ? top + (H - top) * (0.5 + 0.18 * Math.sin(t * 0.7)) : Math.max(top + 90, my)
    if (x < 0 || still) {
      x = tx
      y = ty
    }
    x += (tx - x) * 0.32
    y += (ty - y) * 0.32

    const R = Math.min(170, W * 0.24)
    const ry = R * 0.42
    const sx = W / 2
    const sy = top + 30
    const dx = x - sx, dy = y - sy
    const d = Math.hypot(dx, dy) || 1
    const nx = -dy / d, ny = dx / d

    ctx.clearRect(0, 0, W, H)
    // the beam, fading in from the lens to the pool
    const cone = ctx.createLinearGradient(sx, sy, x, y)
    cone.addColorStop(0, `rgba(${WARM},0.04)`)
    cone.addColorStop(1, `rgba(${WARM},${POOL * 0.5})`)
    ctx.fillStyle = cone
    ctx.beginPath()
    ctx.moveTo(sx + nx * 12, sy + ny * 12)
    ctx.lineTo(sx - nx * 12, sy - ny * 12)
    ctx.lineTo(x - nx * R, y - ny * ry)
    ctx.lineTo(x + nx * R, y + ny * ry)
    ctx.closePath()
    ctx.fill()
    // the pool of light
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(1, ry / R)
    const pool = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 1.25)
    pool.addColorStop(0, `rgba(${WARM},${POOL})`)
    pool.addColorStop(0.7, `rgba(${WARM},${POOL * 0.7})`)
    pool.addColorStop(1, `rgba(${WARM},0)`)
    ctx.fillStyle = pool
    ctx.beginPath()
    ctx.arc(0, 0, R * 1.25, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    // the lamp, turning to follow its beam
    ctx.fillStyle = '#3a3a40'
    ctx.fillRect(sx - 2, top, 4, 22)
    ctx.save()
    ctx.translate(sx, sy - 6)
    ctx.rotate(Math.atan2(dy, dx) - Math.PI / 2)
    ctx.fillStyle = '#26262b'
    ctx.strokeStyle = '#f2f2ec'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(-13, -22)
    ctx.lineTo(13, -22)
    ctx.lineTo(17, 8)
    ctx.lineTo(-17, 8)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = `rgb(${WARM})`
    ctx.fillRect(-15, 6, 30, 5)
    ctx.restore()
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
  }
})
onBeforeUnmount(() => stop())
</script>

<template>
  <!-- under the masthead and every sticky bar that comes later in the page, over the content -->
  <canvas ref="canvas" aria-hidden="true" class="zine-spot pointer-events-none fixed inset-0 z-30 h-full w-full" />
</template>
