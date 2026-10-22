<script setup lang="ts">
// A yes/no in the sign-in popup's frame (.esi): a title, what will happen, and the
// two ways out. Cancel is focused first, because the other button loses work.
import { nextTick, ref, watch } from 'vue'

const props = defineProps<{ open: boolean; title: string; text: string; confirmLabel: string }>()
const emit = defineEmits<{ cancel: []; confirm: [] }>()
const keep = ref<HTMLButtonElement | null>(null)
let last: Element | null = null
watch(
  () => props.open,
  async (o) => {
    if (!import.meta.client) return
    if (o) {
      last = document.activeElement
      await nextTick()
      keep.value?.focus()
    } else (last as HTMLElement | null)?.focus?.()
  },
)
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="esi" role="alertdialog" aria-modal="true" aria-labelledby="ecf-h" aria-describedby="ecf-t" @click.self="emit('cancel')" @keydown.esc="emit('cancel')">
      <div class="esi-box">
        <h2 id="ecf-h">{{ title }}</h2>
        <p id="ecf-t">{{ text }}</p>
        <div class="ecf-b">
          <button ref="keep" type="button" class="ecf-keep" @click="emit('cancel')">Keep what I have</button>
          <button type="button" class="ecf-go" @click="emit('confirm')">{{ confirmLabel }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.ecf-b { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 6px; }
.ecf-b button { all: unset; box-sizing: border-box; cursor: pointer; display: flex; align-items: center; justify-content: center; height: 46px; padding: 0 14px; border-radius: 12px; font-size: 15px; font-weight: 600; text-align: center; transition: background-color .15s, filter .15s; }
.ecf-b .ecf-keep { background: #f3f0e8; color: #0b0b0a; }
.ecf-b .ecf-keep:hover { background: #fff; }
.ecf-b .ecf-go { color: #f08a78; box-shadow: inset 0 0 0 1px rgba(240, 138, 120, 0.4); }
.ecf-b .ecf-go:hover { background: rgba(240, 138, 120, 0.1); }
.ecf-b button:focus-visible { outline: 2px solid rgb(var(--gold)); outline-offset: 2px; }
@media (max-width: 420px) { .ecf-b { grid-template-columns: 1fr; } }
</style>
