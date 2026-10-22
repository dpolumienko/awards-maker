<script setup lang="ts">
// The prototype's date and time popover (.dp): a month of days, hours and five-minute
// steps, Today and Done. The value is a UTC instant read in the show's zone, the
// same contract as UiDateTimeField.
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId } from 'vue'
import { utcToZoned, zonedToUtc } from '#shared/time'

// `min` (a UTC instant): nothing earlier can be picked - closing before opening, a
// ceremony before the vote is over (Ed, 2026-10-22). Earlier days and hours are disabled.
const props = defineProps<{ modelValue: string; timeZone: string; label: string; defaultTime?: string; min?: string }>()
const emit = defineEmits<{ 'update:modelValue': [string] }>()
const id = useId()
const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WD = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
const pad = (v: number) => String(v).padStart(2, '0')

const parts = computed(() => (props.modelValue ? utcToZoned(props.modelValue, props.timeZone) : null))
const minAt = computed(() => {
  if (!props.min) return null
  const p = utcToZoned(props.min, props.timeZone)
  const [h, m] = p.time.split(':').map(Number)
  return { date: p.date, h: h!, mi: m! }
})
const dayOff = (iso: string) => !!minAt.value && iso < minAt.value.date
const hourOff = (h: number) => !!minAt.value && sel.value.date === minAt.value.date && h < minAt.value.h
const minOff = (mi: number) => !!minAt.value && sel.value.date === minAt.value.date && sel.value.h === minAt.value.h && mi < minAt.value.mi
const shown = computed(() => {
  const p = parts.value
  if (!p) return 'Pick a date'
  const [y, m, d] = p.date.split('-').map(Number)
  return `${d} ${MON[m! - 1]!.slice(0, 3)} ${y}, ${p.time}`
})

const open = ref(false)
const root = ref<HTMLElement | null>(null)
const view = ref({ y: 2026, m: 0 })
const sel = ref({ date: '', h: 12, mi: 0 })

function start() {
  const p = parts.value
  const now = new Date()
  const nowIso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  const date = p?.date ?? (minAt.value && minAt.value.date > nowIso ? minAt.value.date : nowIso)
  const [hh, mm] = (p?.time ?? props.defaultTime ?? '20:00').split(':').map(Number)
  sel.value = { date, h: hh!, mi: Math.round(mm! / 5) * 5 % 60 }
  const [y, m] = date.split('-').map(Number)
  view.value = { y: y!, m: m! - 1 }
}
async function toggle() {
  open.value = !open.value
  if (open.value) {
    start()
    await nextTick()
    root.value?.querySelectorAll<HTMLElement>('.dp-col').forEach((c) => {
      const s = c.querySelector<HTMLElement>('.sel')
      if (s) c.scrollTop = s.offsetTop - c.clientHeight / 2 + s.offsetHeight / 2
    })
    root.value?.querySelector<HTMLElement>('.dp-days .sel, .dp-days .today')?.focus()
  }
}
const days = computed(() => {
  const { y, m } = view.value
  const first = (new Date(y, m, 1).getDay() + 6) % 7
  return Array.from({ length: 42 }, (_, k) => {
    const d = new Date(y, m, 1 - first + k)
    return { iso: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, n: d.getDate(), out: d.getMonth() !== m }
  })
})
const today = (() => {
  const t = new Date()
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`
})()
const step = (d: number) => {
  const m = view.value.m + d
  view.value = { y: view.value.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 }
}
function commit() {
  // a day picked at an hour that is now too early lands on the earliest allowed moment
  const m = minAt.value
  if (m && sel.value.date === m.date && sel.value.h * 60 + sel.value.mi < m.h * 60 + m.mi) {
    const up = Math.ceil(m.mi / 5) * 5
    sel.value.h = up === 60 ? m.h + 1 : m.h
    sel.value.mi = up % 60
  }
  emit('update:modelValue', zonedToUtc(sel.value.date, `${pad(sel.value.h)}:${pad(sel.value.mi)}`, props.timeZone))
}
function pickDay(iso: string) {
  if (dayOff(iso)) return
  sel.value.date = iso
  commit()
}
function setNow() {
  const n = new Date()
  if (dayOff(today)) return
  sel.value = { date: today, h: n.getHours(), mi: Math.ceil(n.getMinutes() / 5) * 5 % 60 }
  view.value = { y: n.getFullYear(), m: n.getMonth() }
  commit()
}
function close() {
  open.value = false
  root.value?.querySelector<HTMLElement>('.dp-btn')?.focus()
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') return close()
  const b = (e.target as HTMLElement).closest<HTMLElement>('.dp-days button')
  const dlt = ({ ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 } as Record<string, number>)[e.key]
  if (!b || !dlt) return
  e.preventDefault()
  const d = new Date(b.dataset.d + 'T12:00')
  d.setDate(d.getDate() + dlt)
  const iso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  if (d.getMonth() !== view.value.m) view.value = { y: d.getFullYear(), m: d.getMonth() }
  nextTick(() => root.value?.querySelector<HTMLElement>(`[data-d="${iso}"]`)?.focus())
}
function outside(e: MouseEvent) {
  if (open.value && root.value && !root.value.contains(e.target as Node)) open.value = false
}
onMounted(() => document.addEventListener('mousedown', outside))
onBeforeUnmount(() => document.removeEventListener('mousedown', outside))
</script>

<template>
  <div ref="root" class="dp">
    <button type="button" class="dd-btn dp-btn" aria-haspopup="dialog" :aria-expanded="open" :aria-label="`${label}: ${shown}`" @click="toggle">
      <span :id="`${id}-v`">{{ shown }}</span><i class="cal" aria-hidden="true" />
    </button>
    <div v-if="open" class="dp-pop" role="dialog" :aria-label="`${label}: pick a date and time`" @keydown="onKey">
      <div class="dp-cal">
        <div class="dp-h">
          <button type="button" class="pv" aria-label="Previous month" @click="step(-1)" />
          <span>{{ MON[view.m] }} {{ view.y }}</span>
          <button type="button" class="nx" aria-label="Next month" @click="step(1)" />
        </div>
        <div class="dp-wd"><span v-for="w in WD" :key="w">{{ w }}</span></div>
        <div class="dp-days">
          <button
            v-for="d in days"
            :key="d.iso"
            type="button"
            :data-d="d.iso"
            :class="[d.out && 'out', d.iso === today && 'today', d.iso === sel.date && 'sel']"
            :aria-pressed="d.iso === sel.date"
            :disabled="dayOff(d.iso)"
            :tabindex="d.iso === sel.date ? 0 : -1"
            @click="pickDay(d.iso)"
          >{{ d.n }}</button>
        </div>
      </div>
      <div class="dp-time">
        <p class="dp-th">Time</p>
        <div class="dp-col" data-col="h">
          <button v-for="h in 24" :key="h" type="button" :class="h - 1 === sel.h && 'sel'" :disabled="hourOff(h - 1)" @click="sel.h = h - 1; commit()">{{ pad(h - 1) }}</button>
        </div>
        <div class="dp-col" data-col="m">
          <button v-for="k in 12" :key="k" type="button" :class="(k - 1) * 5 === sel.mi && 'sel'" :disabled="minOff((k - 1) * 5)" @click="sel.mi = (k - 1) * 5; commit()">{{ pad((k - 1) * 5) }}</button>
        </div>
      </div>
      <div class="dp-foot">
        <button type="button" class="dp-now" :disabled="dayOff(today)" @click="setNow">Today</button>
        <button type="button" class="btn sm p" @click="close">Done</button>
      </div>
    </div>
  </div>
</template>
