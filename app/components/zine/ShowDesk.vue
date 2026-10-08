<script setup lang="ts">
// The host's controls at the top of the dashboard - Night v2 only (review
// 2026-10-08, prototype "B · Show desk"; they used to sit under the charts).
// One bar: the ON AIR lamp with the switch that takes the page offline and back,
// then the moves - the next one-way move for this phase as the main button, the
// ceremony and the public page beside it. Four equal cells read as a stepper
// (review 2026-10-08), so it is a toolbar now. Delete is apart, at the bottom of
// the page.
//
// Everything that cannot be undone, or that a viewer would notice, asks first in
// one dialog - the ceremony too, it goes on stream. The parent does the work;
// this only asks and reports the answer.
import { computed, ref } from 'vue'

export type DeskAction = 'close' | 'publish' | 'offline' | 'online' | 'delete' | 'ceremony'
const { phase, offline, slug, closesLabel } = defineProps<{
  phase: 'soon' | 'open' | 'capped' | 'counting' | 'revealed'
  offline: boolean
  slug: string
  closesLabel: string
}>()
const emit = defineEmits<{ act: [DeskAction] }>()
const busy = defineModel<boolean>('busy', { default: false })

const main = computed(() => {
  if (offline) return { label: '', line: 'Voting is paused while the page is offline.', act: null }
  if (phase === 'open' || phase === 'soon') return { label: 'Close voting now', line: `Voting runs to ${closesLabel} on its own.`, act: 'close' as const }
  if (phase === 'counting' || phase === 'capped') return { label: 'Publish the winners', line: 'Voting is closed. The counts are yours until you publish.', act: 'publish' as const }
  return { label: '', line: 'The winners are on the public page.', act: null }
})

const ASK: Record<DeskAction, { title: string; lines: string[]; ok: string; danger?: boolean }> = {
  close: { title: 'Close voting now?', lines: ['Nobody can vote after this, even before the closing date.', 'Ballots already cast are kept and counted.'], ok: 'Close voting' },
  publish: { title: 'Publish the winners?', lines: ['Every count goes on the public page.', 'This cannot be undone.'], ok: 'Publish' },
  offline: { title: 'Take it offline?', lines: ['The link stops working: viewers can neither see nor vote.', 'Ballots, nominees and settings stay as they are.', 'Put it back online any time from here.'], ok: 'Take offline' },
  online: { title: 'Put it back online?', lines: ['The page and the link work again, ballots and all.'], ok: 'Put back online' },
  delete: { title: 'Delete for good?', lines: ['The page, the link and every ballot are gone.', 'To keep them, take it offline instead.'], ok: 'Delete', danger: true },
  ceremony: { title: 'Run the ceremony?', lines: ['Opens the reveal screen: winners one category at a time, made for your stream.', 'Nothing is published - the public page changes only when you publish the winners.'], ok: 'Open the ceremony' },
}
const asking = ref<DeskAction | null>(null)
const dialog = ref<HTMLDialogElement | null>(null)
function ask(a: DeskAction) {
  asking.value = a
  dialog.value?.showModal()
}
function answer(yes: boolean) {
  dialog.value?.close()
  if (yes && asking.value) emit('act', asking.value)
  asking.value = null
}
defineExpose({ ask })
</script>

<template>
  <section class="sd" aria-label="Show controls">
    <div class="sd-status">
      <p class="sd-lamp" :class="offline && 'is-off'"><i aria-hidden="true" />{{ offline ? 'Off air' : 'On air' }}</p>
      <button
        type="button"
        role="switch"
        class="sd-switch"
        :aria-checked="!offline"
        :disabled="busy"
        @click="ask(offline ? 'online' : 'offline')"
      >
        <span class="sd-track" aria-hidden="true" />Public page {{ offline ? 'offline' : 'online' }}
      </button>
      <p class="sd-note">{{ main.line }}</p>
    </div>

    <div class="sd-moves">
      <button v-if="main.act" type="button" class="sd-btn is-main" :disabled="busy" @click="ask(main.act)">{{ main.label }}</button>
      <button type="button" class="sd-btn" :disabled="busy || offline" @click="ask('ceremony')">Run the ceremony</button>
      <NuxtLink class="sd-btn" :class="offline && 'is-off'" :to="`/a/${slug}`" :aria-disabled="offline || undefined" :tabindex="offline ? -1 : undefined">
        Public page
      </NuxtLink>
    </div>

    <dialog ref="dialog" class="sd-dlg" @cancel.prevent="answer(false)" @click.self="answer(false)">
      <div v-if="asking">
        <h2 class="zine-display">{{ ASK[asking].title }}</h2>
        <ul><li v-for="l in ASK[asking].lines" :key="l">{{ l }}</li></ul>
        <div class="sd-row">
          <button type="button" class="sd-btn" @click="answer(false)">Cancel</button>
          <button type="button" class="sd-btn" :class="ASK[asking].danger ? 'is-danger' : 'is-main'" @click="answer(true)">{{ ASK[asking].ok }}</button>
        </div>
      </div>
    </dialog>
  </section>
</template>

<style scoped>
.sd { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px 24px; margin-top: 24px; padding: 14px 18px; border: 2px solid rgb(var(--ink)); background: rgb(var(--s1)); }
.sd-status { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 20px; }
.sd-lamp { display: flex; align-items: center; gap: 8px; padding: 6px 10px 5px; background: rgb(var(--ink)); color: rgb(var(--canvas)); font: 900 13px/1 var(--font-display), sans-serif; font-stretch: 125%; letter-spacing: 0.04em; text-transform: uppercase; }
.sd-lamp i { width: 9px; height: 9px; border-radius: 50%; background: rgb(var(--pink)); animation: sd-blink 1.6s infinite; }
.sd-lamp.is-off { background: rgb(var(--s3)); color: rgb(var(--ink-muted)); }
.sd-lamp.is-off i { background: rgb(var(--ink-muted)); animation: none; }
@keyframes sd-blink { 50% { opacity: 0.35; } }
.sd-switch { display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 700; color: rgb(var(--ink)); }
.sd-track { position: relative; width: 40px; height: 22px; border: 2px solid rgb(var(--ink-muted)); }
.sd-track::after { content: ''; position: absolute; top: 3px; left: 3px; width: 12px; height: 12px; background: rgb(var(--ink-muted)); transition: transform 0.2s; }
.sd-switch[aria-checked='true'] .sd-track { background: rgb(var(--gold)); border-color: rgb(var(--gold)); }
.sd-switch[aria-checked='true'] .sd-track::after { transform: translateX(18px); background: #fff; }
.sd-switch:focus-visible { outline: 3px solid rgb(var(--gold)); outline-offset: 3px; }
.sd-note { font-size: 13px; color: rgb(var(--ink-muted)); }
.sd-moves { display: flex; flex-wrap: wrap; gap: 8px; }
.sd-btn { display: inline-flex; align-items: center; height: 40px; padding: 0 16px; border: 2px solid rgb(var(--ink)); color: rgb(var(--ink)); font-weight: 800; font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase; text-decoration: none; transition: background-color 0.15s, color 0.15s; }
.sd-btn:hover:not(:disabled):not(.is-off), .sd-btn:focus-visible { background: rgb(var(--ink)); color: rgb(var(--canvas)); }
.sd-btn.is-main { background: rgb(var(--gold)); border-color: rgb(var(--gold)); color: #fff; }
.sd-btn.is-main:hover:not(:disabled) { background: rgb(var(--ink)); border-color: rgb(var(--ink)); color: rgb(var(--canvas)); }
.sd-btn.is-danger { border-color: rgb(var(--danger)); background: rgb(var(--danger)); color: #fff; }
.sd-btn:disabled, .sd-btn.is-off { cursor: default; opacity: 0.45; pointer-events: none; }
.sd-dlg { width: min(480px, calc(100% - 32px)); padding: 24px; border: 3px solid rgb(var(--ink)); background: rgb(var(--canvas)); color: rgb(var(--ink)); }
.sd-dlg::backdrop { background: rgb(0 0 0 / 0.5); }
.sd-dlg h2 { font-size: 28px; line-height: 1; text-transform: uppercase; }
.sd-dlg ul { margin: 14px 0 0; padding-left: 18px; display: grid; gap: 8px; font-size: 14px; color: rgb(var(--ink-2)); }
.sd-row { display: flex; justify-content: flex-end; gap: 8px; margin-top: 22px; }
@media (prefers-reduced-motion: reduce) { .sd-lamp i { animation: none; } .sd-track::after { transition: none; } }
</style>
