<script setup lang="ts">
// The prototype's own-colour picker (.cp): a rainbow dot after the preset accents
// opens a popover with a saturation/brightness field, a hue strip, the swatch and
// a hex field, Cancel and Apply. Arrow keys move both handles.
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps<{ modelValue?: string; pressed: boolean }>()
const emit = defineEmits<{ apply: [string] }>()

const open = ref(false)
const root = ref<HTMLElement | null>(null)
const h = ref(40)
const sv = ref<[number, number]>([0.55, 0.79])
const hexIn = ref('')

function hex2hsv(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn
  let hh = 0
  if (d) hh = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [(hh * 60 + 360) % 360, mx ? d / mx : 0, mx]
}
function hsv2hex(hh: number, s: number, v: number) {
  const f = (k: number) => {
    const x = (k + hh / 60) % 6
    return Math.round((v - v * s * Math.max(0, Math.min(x, 4 - x, 1))) * 255)
  }
  return '#' + [f(5), f(3), f(1)].map((c) => c.toString(16).padStart(2, '0')).join('').toUpperCase()
}
const cur = computed(() => hsv2hex(h.value, sv.value[0], sv.value[1]))

function toggle() {
  if (open.value) return (open.value = false)
  const [hh, s, v] = hex2hsv(/^#[\da-f]{6}$/i.test(props.modelValue ?? '') ? props.modelValue! : '#C9A45C')
  h.value = hh
  sv.value = [s, v]
  hexIn.value = cur.value.slice(1)
  open.value = true
  requestAnimationFrame(() => root.value?.querySelector<HTMLElement>('.ecp-sv')?.focus())
}
function drag(e: PointerEvent, fn: (x: number, y: number) => void) {
  const el = e.currentTarget as HTMLElement
  el.setPointerCapture(e.pointerId)
  const mv = (ev: PointerEvent) => {
    const r = el.getBoundingClientRect()
    fn(Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height)))
    hexIn.value = cur.value.slice(1)
  }
  mv(e)
  const up = () => { el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up) }
  el.addEventListener('pointermove', mv)
  el.addEventListener('pointerup', up)
}
function svKey(e: KeyboardEvent) {
  const d = ({ ArrowLeft: [-0.02, 0], ArrowRight: [0.02, 0], ArrowUp: [0, 0.02], ArrowDown: [0, -0.02] } as Record<string, number[]>)[e.key]
  if (!d) return
  e.preventDefault()
  sv.value = [Math.min(1, Math.max(0, sv.value[0] + d[0]!)), Math.min(1, Math.max(0, sv.value[1] + d[1]!))]
  hexIn.value = cur.value.slice(1)
}
function hueKey(e: KeyboardEvent) {
  const d = ({ ArrowLeft: -4, ArrowRight: 4 } as Record<string, number>)[e.key]
  if (!d) return
  e.preventDefault()
  h.value = (h.value + d + 360) % 360
  hexIn.value = cur.value.slice(1)
}
function onHex() {
  hexIn.value = hexIn.value.replace(/[^\da-f]/gi, '').slice(0, 6)
  if (hexIn.value.length === 6) {
    const [hh, s, v] = hex2hsv('#' + hexIn.value)
    h.value = hh
    sv.value = [s, v]
  }
}
function close() {
  open.value = false
  root.value?.querySelector<HTMLElement>('.ecp-btn')?.focus()
}
function apply() {
  emit('apply', cur.value)
  close()
}
function outside(e: MouseEvent) {
  if (open.value && root.value && !root.value.contains(e.target as Node)) open.value = false
}
onMounted(() => document.addEventListener('mousedown', outside))
onBeforeUnmount(() => document.removeEventListener('mousedown', outside))
</script>

<template>
  <span ref="root" class="ecp" @keydown.esc="close">
    <button
      type="button"
      class="ecp-btn"
      :aria-pressed="pressed"
      aria-haspopup="dialog"
      :aria-expanded="open"
      aria-label="Custom colour"
      :style="pressed && modelValue ? { '--cc': modelValue } : undefined"
      @click="toggle"
    />
    <div v-if="open" class="ecp-pop" role="dialog" aria-label="Custom colour">
      <div
        class="ecp-sv"
        tabindex="0"
        aria-label="Saturation and brightness"
        :style="{ background: `linear-gradient(0deg,#000,transparent),linear-gradient(90deg,#fff,hsl(${h},100%,50%))` }"
        @pointerdown="drag($event, (x, y) => (sv = [x, 1 - y]))"
        @keydown="svKey"
      >
        <i :style="{ left: sv[0] * 100 + '%', top: (1 - sv[1]) * 100 + '%', background: cur }" />
      </div>
      <div class="ecp-hue" tabindex="0" aria-label="Hue" @pointerdown="drag($event, (x) => (h = x * 360))" @keydown="hueKey">
        <i :style="{ left: (h / 360) * 100 + '%', background: `hsl(${h},100%,50%)` }" />
      </div>
      <div class="ecp-row">
        <span class="ecp-sw" :style="{ background: cur }" />
        <label class="ecp-hex"><span>#</span><input v-model="hexIn" type="text" maxlength="6" spellcheck="false" aria-label="Hex colour" @input="onHex" @keydown.enter.prevent="apply" /></label>
      </div>
      <div class="ecp-foot">
        <button type="button" class="ecp-x" @click="close">Cancel</button>
        <button type="button" class="ecp-ok" @click="apply">Apply</button>
      </div>
    </div>
  </span>
</template>

<style scoped>
.ecp { position: relative; display: inline-flex; }
.ecp-btn { all: unset; cursor: pointer; box-sizing: border-box; width: 38px; height: 38px; border-radius: 50%; background: var(--cc, conic-gradient(#e8543c, #c9a45c, #3fd39a, #3fa9ff, #9b7bff, #ff6fb1, #e8543c)); box-shadow: inset 0 0 0 2px transparent, 0 0 0 2px transparent; transition: box-shadow 0.15s; }
.ecp-btn[aria-pressed='true'] { box-shadow: inset 0 0 0 2px #f6f4ee, 0 0 0 2px rgb(var(--ink)); }
.ecp-btn:focus-visible { outline: 2px solid rgb(var(--gold)); outline-offset: 3px; }
.ecp-pop { position: absolute; right: 0; top: calc(100% + 8px); z-index: 50; width: 248px; box-sizing: border-box; background: rgb(var(--s3)); border-radius: 12px; padding: 14px; display: grid; gap: 12px; box-shadow: 0 20px 40px -12px rgba(0, 0, 0, 0.8); }
.ecp-sv { position: relative; height: 150px; border-radius: 12px; cursor: crosshair; touch-action: none; }
.ecp-sv i, .ecp-hue i { position: absolute; width: 16px; height: 16px; border-radius: 50%; box-shadow: 0 0 0 2px #fff, 0 1px 4px rgba(0, 0, 0, 0.5); transform: translate(-50%, -50%); pointer-events: none; }
.ecp-hue { position: relative; height: 12px; border-radius: 12px; cursor: pointer; touch-action: none; background: linear-gradient(90deg, #f00, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00); }
.ecp-hue i { top: 50%; }
.ecp-sv:focus-visible, .ecp-hue:focus-visible { outline: 2px solid rgb(var(--gold)); outline-offset: 2px; }
.ecp-row { display: flex; gap: 10px; align-items: center; }
.ecp-sw { width: 36px; height: 36px; border-radius: 12px; flex: none; }
.ecp-hex { flex: 1; min-width: 0; display: flex; align-items: center; gap: 4px; background: rgb(var(--canvas)); border-radius: 12px; padding: 0 12px; height: 36px; font-size: 14px; color: rgb(var(--ink-muted)); }
.ecp-hex input { all: unset; background: none !important; padding: 0 !important; height: auto !important; box-shadow: none !important; border: 0 !important; flex: 1; min-width: 0; color: rgb(var(--ink)); font-size: 14px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.04em; }
.ecp-hex:focus-within { box-shadow: inset 0 0 0 1px rgb(var(--gold)); }
.ecp-foot { display: flex; justify-content: space-between; align-items: center; }
.ecp-x { all: unset; cursor: pointer; font-size: 14px; color: rgb(var(--ink-2)); text-decoration: underline; text-underline-offset: 4px; }
.ecp-ok { all: unset; cursor: pointer; height: 34px; padding: 0 16px; border-radius: 12px; background: #f3f0e8; color: #0b0b0a; font-size: 14px; font-weight: 600; }
.ecp-ok:hover { background: #fff; }
.ecp-ok:focus-visible { outline: 2px solid rgb(var(--gold)); outline-offset: 2px; }
</style>
