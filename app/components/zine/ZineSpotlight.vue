<script setup lang="ts">
// Fanzine Night's light: a follow-spot hung under the masthead. The room is
// dimmed and the beam cuts the dark away down to a pool where the pointer is, so
// whatever you point at is lit. Fixed to the viewport, so the lamp rides along
// as the page scrolls; with no pointer (touch, or a still mouse) it sweeps the
// stage on its own. Chosen from the backdrop board, outputs/fanzine-backgrounds-2026-10-06.
import { onBeforeUnmount, onMounted, ref } from 'vue'

const canvas = ref<HTMLCanvasElement | null>(null)
// how dark the room is outside the beam: Night's body type keeps >4.5:1 under it
const VEIL = 0.45
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
    // the dimmed room
    ctx.fillStyle = `rgba(0,0,0,${VEIL})`
    ctx.fillRect(0, top, W, H - top)

    // the beam: the dark cut away from the lens to the pool
    ctx.globalCompositeOperation = 'destination-out'
    const cone = ctx.createLinearGradient(sx, sy, x, y)
    cone.addColorStop(0, 'rgba(0,0,0,0.5)')
    cone.addColorStop(1, 'rgba(0,0,0,0.95)')
    ctx.fillStyle = cone
    ctx.beginPath()
    ctx.moveTo(sx + nx * 12, sy + ny * 12)
    ctx.lineTo(sx - nx * 12, sy - ny * 12)
    ctx.lineTo(x - nx * R, y - ny * ry)
    ctx.lineTo(x + nx * R, y + ny * ry)
    ctx.closePath()
    ctx.fill()
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(1, ry / R)
    const pool = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 1.25)
    pool.addColorStop(0, 'rgba(0,0,0,1)')
    pool.addColorStop(0.7, 'rgba(0,0,0,0.95)')
    pool.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = pool
    ctx.beginPath()
    ctx.arc(0, 0, R * 1.25, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalCompositeOperation = 'source-over'
    // a little warm light in the pool, and its edge printed in the press blue
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, R)
    glow.addColorStop(0, 'rgba(255,248,230,0.07)')
    glow.addColorStop(1, 'rgba(255,248,230,0)')
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(0, 0, R, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(92,172,232,0.45)'
    ctx.lineWidth = 2
    ctx.setLineDash([3, 6])
    ctx.beginPath()
    ctx.arc(0, 0, R * 1.05, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])
    // restore() would bring back the erasing mode that was set before save()
    ctx.restore()
    ctx.globalCompositeOperation = 'source-over'

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
    ctx.fillStyle = '#5cace8'
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
  <canvas ref="canvas" aria-hidden="true" class="pointer-events-none fixed inset-0 z-30 h-full w-full" />
</template>
