<script setup lang="ts">
// The host's controls at the top of the dashboard - Night v2 only (review
// 2026-10-08, prototype "B · Show desk"; they used to sit under the charts). An
// ON AIR lamp with the switch that takes the page offline and back, then three
// keys: the next one-way move for this phase, the ceremony, the public page.
// Delete is apart, at the bottom of the page (the `danger` slot of the parent).
//
// Everything that cannot be undone, or that a viewer would notice, asks first in
// one dialog. The parent does the work; this only asks and reports the answer.
import { computed, ref } from 'vue'

export type DeskAction = 'close' | 'publish' | 'offline' | 'online' | 'delete'
const { phase, offline, slug, closesLabel } = defineProps<{
  phase: 'soon' | 'open' | 'capped' | 'counting' | 'revealed'
  offline: boolean
  slug: string
  closesLabel: string
}>()
const emit = defineEmits<{ act: [DeskAction] }>()
const busy = defineModel<boolean>('busy', { default: false })

const main = computed(() => {
  if (offline) return { label: 'Voting paused', line: 'Back online, it picks up where it was.', act: null }
  if (phase === 'open' || phase === 'soon') return { label: 'Close voting now', line: `Runs to ${closesLabel} on its own. Ballots cast are kept.`, act: 'close' as const }
  if (phase === 'counting' || phase === 'capped') return { label: 'Publish the winners', line: 'Puts every count on the public page. Cannot be undone.', act: 'publish' as const }
  return { label: 'Winners are out', line: 'The counts are on the public page.', act: null }
})

const ASK: Record<DeskAction, { title: string; lines: string[]; ok: string; danger?: boolean }> = {
  close: { title: 'Close voting now?', lines: ['Nobody can vote after this, even before the closing date.', 'Ballots already cast are kept and counted.'], ok: 'Close voting' },
  publish: { title: 'Publish the winners?', lines: ['Every count goes on the public page.', 'This cannot be undone.'], ok: 'Publish' },
  offline: { title: 'Take it offline?', lines: ['The link stops working: viewers can neither see nor vote.', 'Ballots, nominees and settings stay as they are.', 'Put it back online any time from here.'], ok: 'Take offline' },
  online: { title: 'Put it back online?', lines: ['The page and the link work again, ballots and all.'], ok: 'Put back online' },
  delete: { title: 'Delete for good?', lines: ['The page, the link and every ballot are gone.', 'To keep them, take it offline instead.'], ok: 'Delete', danger: true },
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
    <div class="sd-air">
      <p class="sd-lamp" :class="offline && 'is-off'"><i aria-hidden="true" />{{ offline ? 'Off air' : 'On air' }}</p>
      <div>
        <p class="sd-note">{{ offline ? 'The link shows "not available". Ballots are kept.' : 'The page and the link are live.' }}</p>
        <button
          type="button"
          role="switch"
          class="sd-switch"
          :aria-checked="!offline"
          :disabled="busy"
          @click="ask(offline ? 'online' : 'offline')"
        >
          <span class="sd-track" aria-hidden="true" />Page online
        </button>
      </div>
    </div>

    <button type="button" class="sd-key" :class="main.act && 'is-main'" :disabled="!main.act || busy" @click="main.act && ask(main.act)">
      <b class="zine-display">{{ main.label }}</b>
      <span>{{ main.line }}</span>
    </button>
    <NuxtLink class="sd-key" :class="offline && 'is-off'" :to="`/my-awards/${slug}/reveal`" :aria-disabled="offline || undefined" :tabindex="offline ? -1 : undefined">
      <b class="zine-display">Run the ceremony</b>
      <span>Reveal the winners on stream, one category at a time.</span>
    </NuxtLink>
    <NuxtLink class="sd-key" :class="offline && 'is-off'" :to="`/a/${slug}`" :aria-disabled="offline || undefined" :tabindex="offline ? -1 : undefined">
      <b class="zine-display">Public page</b>
      <span>What your viewers see right now.</span>
    </NuxtLink>

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
.sd { display: grid; margin-top: 24px; border: 2.5px solid rgb(var(--ink)); }
@media (min-width: 1024px) { .sd { grid-template-columns: 260px repeat(3, minmax(0, 1fr)); } }
.sd-air { display: grid; align-content: space-between; gap: 18px; padding: 18px; background: rgb(var(--ink)); color: rgb(var(--canvas)); }
.sd-lamp { display: flex; align-items: center; gap: 10px; font: 900 22px/1 var(--font-display), sans-serif; font-stretch: 125%; text-transform: uppercase; }
.sd-lamp i { width: 14px; height: 14px; border-radius: 50%; background: rgb(var(--pink)); animation: sd-blink 1.6s infinite; }
.sd-lamp.is-off i { background: rgb(var(--ink-muted)); animation: none; }
@keyframes sd-blink { 50% { opacity: 0.35; } }
.sd-note { margin-bottom: 10px; font-size: 13px; opacity: 0.8; }
.sd-switch { display: flex; align-items: center; gap: 10px; font-size: 13px; font-weight: 700; color: inherit; }
.sd-track { position: relative; width: 52px; height: 28px; border: 2px solid rgb(var(--canvas)); }
.sd-track::after { content: ''; position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; background: rgb(var(--canvas)); transition: transform 0.2s; }
.sd-switch[aria-checked='true'] .sd-track { background: rgb(var(--gold)); border-color: rgb(var(--gold)); }
.sd-switch[aria-checked='true'] .sd-track::after { transform: translateX(24px); background: #fff; }
.sd-switch:focus-visible { outline: 3px solid rgb(var(--gold)); outline-offset: 3px; }
.sd-key { display: grid; align-content: space-between; gap: 14px; min-height: 170px; padding: 18px; text-align: left; border-top: 2.5px solid rgb(var(--ink)); color: rgb(var(--ink)); text-decoration: none; transition: background-color 0.15s, color 0.15s; }
@media (min-width: 1024px) { .sd-key { border-top: 0; border-left: 2.5px solid rgb(var(--ink)); } }
.sd-key b { font-size: 22px; line-height: 1; text-transform: uppercase; }
.sd-key span { font-size: 13px; color: rgb(var(--ink-2)); }
.sd-key:hover:not(:disabled):not(.is-off), .sd-key:focus-visible { background: rgb(var(--ink)); color: rgb(var(--canvas)); }
.sd-key:hover:not(:disabled):not(.is-off) span, .sd-key:focus-visible span { color: rgb(var(--canvas) / 0.75); }
.sd-key.is-main { background: rgb(var(--gold)); color: #fff; }
.sd-key.is-main span { color: #fff; }
.sd-key:disabled, .sd-key.is-off { cursor: default; color: rgb(var(--ink-muted)); pointer-events: none; }
.sd-dlg { width: min(480px, calc(100% - 32px)); padding: 24px; border: 3px solid rgb(var(--ink)); background: rgb(var(--canvas)); color: rgb(var(--ink)); }
.sd-dlg::backdrop { background: rgb(0 0 0 / 0.5); }
.sd-dlg h2 { font-size: 28px; line-height: 1; text-transform: uppercase; }
.sd-dlg ul { margin: 14px 0 0; padding-left: 18px; display: grid; gap: 8px; font-size: 14px; color: rgb(var(--ink-2)); }
.sd-row { display: flex; justify-content: flex-end; gap: 8px; margin-top: 22px; }
.sd-btn { height: 44px; padding: 0 18px; border: 2px solid rgb(var(--ink)); font-weight: 800; font-size: 13px; letter-spacing: 0.06em; text-transform: uppercase; }
.sd-btn:hover { background: rgb(var(--ink)); color: rgb(var(--canvas)); }
.sd-btn.is-main { background: rgb(var(--ink)); color: rgb(var(--canvas)); }
.sd-btn.is-main:hover { background: rgb(var(--gold)); border-color: rgb(var(--gold)); color: #fff; }
.sd-btn.is-danger { border-color: rgb(var(--danger)); background: rgb(var(--danger)); color: #fff; }
@media (prefers-reduced-motion: reduce) { .sd-lamp i { animation: none; } .sd-track::after { transition: none; } }
</style>
