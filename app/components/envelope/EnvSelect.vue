<script setup lang="ts">
// The prototype's dropdown (.dd): a button and a listbox, no native <select>.
// Arrows move, Enter/Space picks, Esc and Tab close.
import { computed, nextTick, ref, useId } from 'vue'

const props = defineProps<{ modelValue: string; options: { id: string; label: string; sub?: string }[]; labelledby?: string }>()
const emit = defineEmits<{ 'update:modelValue': [string] }>()
const id = useId()
const open = ref(false)
const act = ref(0)
const list = ref<HTMLUListElement | null>(null)
const btn = ref<HTMLButtonElement | null>(null)
const cur = computed(() => props.options.find((o) => o.id === props.modelValue) ?? props.options[0])

async function toggle(v = !open.value) {
  open.value = v
  if (!v) return
  act.value = Math.max(0, props.options.findIndex((o) => o.id === props.modelValue))
  await nextTick()
  list.value?.focus()
  list.value?.querySelector<HTMLElement>(`[data-k="${act.value}"]`)?.scrollIntoView({ block: 'nearest' })
}
function pick(k: number) {
  const o = props.options[k]
  if (o) emit('update:modelValue', o.id)
  open.value = false
  btn.value?.focus()
}
async function onKey(e: KeyboardEvent) {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault()
    act.value = (act.value + (e.key === 'ArrowDown' ? 1 : -1) + props.options.length) % props.options.length
    await nextTick()
    list.value?.querySelector<HTMLElement>(`[data-k="${act.value}"]`)?.scrollIntoView({ block: 'nearest' })
  } else if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    pick(act.value)
  } else if (e.key === 'Escape' || e.key === 'Tab') {
    open.value = false
    if (e.key === 'Escape') btn.value?.focus()
  }
}
function onBlur() {
  setTimeout(() => {
    if (!list.value?.contains(document.activeElement)) open.value = false
  }, 80)
}
</script>

<template>
  <div class="dd">
    <button ref="btn" type="button" class="dd-btn" aria-haspopup="listbox" :aria-expanded="open" :aria-labelledby="labelledby ? `${labelledby} ${id}-v` : undefined" @click="toggle()">
      <span :id="`${id}-v`">{{ cur?.label }}</span><small v-if="cur?.sub">{{ cur.sub }}</small><i aria-hidden="true" />
    </button>
    <ul v-show="open" ref="list" class="dd-list" role="listbox" tabindex="-1" :aria-activedescendant="`${id}-o${act}`" @keydown="onKey" @blur="onBlur">
      <li
        v-for="(o, k) in options"
        :id="`${id}-o${k}`"
        :key="o.id"
        role="option"
        :data-k="k"
        :aria-selected="o.id === modelValue"
        :class="k === act && 'act'"
        @mousedown.prevent="pick(k)"
        @mouseenter="act = k"
      >{{ o.label }}<small v-if="o.sub">{{ o.sub }}</small></li>
    </ul>
  </div>
</template>
