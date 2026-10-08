<script setup lang="ts">
// The builder's steps as a strip of admission tickets - Night v2 only (review
// 2026-10-08, prototype "A · Tickets"). The ticket you are on is lifted and
// inked, any ticket is one click away. Each says how it stands, from the
// builder's own publish checks: OK when filled in, Missing (with what is
// missing) once you have been there and left it short, nothing before that.
// `flash` lights a ticket for a moment when something lands in it from another
// step - a pack picked on the first step fills the categories.
export interface BuilderStep {
  id: string
  title: string
  sub: string
  state: 'done' | 'missing' | 'todo'
  /** what is still missing, for the Missing stamp */
  missing?: string
  flash?: boolean
}
defineProps<{ steps: BuilderStep[]; current: string }>()
const emit = defineEmits<{ go: [string] }>()
</script>

<template>
  <nav class="bt" aria-label="Builder steps">
    <ol>
      <li v-for="(s, i) in steps" :key="s.id">
        <button
          type="button"
          class="bt-tik"
          :class="[`is-${s.state}`, s.flash && 'is-flash']"
          :aria-current="s.id === current ? 'step' : undefined"
          :title="s.state === 'missing' ? s.missing : undefined"
          @click="emit('go', s.id)"
        >
          <span class="bt-n tnum" aria-hidden="true">0{{ i + 1 }}</span>
          <span class="bt-t">{{ s.title }}</span>
          <span class="bt-s">{{ s.sub }}</span>
          <span v-if="s.state === 'done'" class="bt-ok">OK<span class="sr-only"> - done</span></span>
          <span v-else-if="s.state === 'missing'" class="bt-ok bt-miss">Missing<span class="sr-only">: {{ s.missing }}</span></span>
        </button>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.bt ol { display: grid; grid-template-columns: repeat(5, minmax(150px, 1fr)); margin: 0; padding: 8px 0 0; list-style: none; overflow-x: auto; }
.bt-tik { position: relative; display: grid; gap: 4px; width: 100%; height: 100%; padding: 10px 14px; text-align: left; border: 2px dashed rgb(var(--ink)); background: rgb(var(--canvas)); color: rgb(var(--ink)); transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.15s; }
.bt li + li .bt-tik { margin-left: -2px; width: calc(100% + 2px); }
.bt-tik:hover:not([aria-current='step']) { background: rgb(var(--s2)); }
.bt-tik[aria-current='step'] { z-index: 1; background: rgb(var(--ink)); color: rgb(var(--canvas)); transform: translateY(-6px); }
.bt-tik:focus-visible { outline: 3px solid rgb(var(--gold)); outline-offset: 2px; }
.bt-n { font: 900 22px/1 var(--font-display), sans-serif; font-stretch: 130%; color: rgb(var(--hair)); }
.bt-tik.is-done .bt-n, .bt-tik[aria-current='step'] .bt-n { color: rgb(var(--gold-text)); }
.bt-t { font-weight: 800; font-size: 15px; }
.bt-s { font-size: 12px; color: rgb(var(--ink-muted)); }
.bt-tik[aria-current='step'] .bt-s { color: rgb(var(--canvas) / 0.7); }
.bt-tik.is-missing { border-color: rgb(var(--danger)); }
/* something landed here from another step */
.bt-tik.is-flash { animation: bt-flash 1.2s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes bt-flash { 0%, 40% { background: rgb(var(--gold)); color: #fff; transform: translateY(-6px); } }
.bt-ok { position: absolute; top: 10px; right: 10px; padding: 3px 7px 2px; border: 3px double currentColor; color: rgb(var(--gold-text)); font: 800 11px/1.2 var(--font-display), sans-serif; letter-spacing: 0.06em; transform: rotate(-4deg); }
.bt-ok.bt-miss { color: rgb(var(--danger)); }
@media (prefers-reduced-motion: reduce) { .bt-tik { transition: none; } .bt-tik.is-flash { animation: none; } }
</style>
