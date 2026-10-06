<script setup lang="ts">
// A ballot's rows on the Fanzine landing that you can actually mark: click a
// name and the pen circles it (review 2026-10-06). One pick per group, like the
// real ballot. Used by the "How an awards gets made" strip and the ballot slip.
import ZinePen from './ZinePen.vue'

const { names, label, ruled = false } = defineProps<{ names: string[]; label: string; ruled?: boolean }>()
const picked = defineModel<number>({ default: 0 })
</script>

<template>
  <div role="radiogroup" :aria-label="label" class="zb" :class="ruled && 'is-ruled'">
    <button
      v-for="(n, i) in names"
      :key="n"
      type="button"
      role="radio"
      :aria-checked="picked === i"
      class="zb-row"
      @click="picked = i"
    >
      <span class="zb-box" :class="picked === i && 'is-on'" aria-hidden="true" />
      <ZinePen :on="picked === i">{{ n }}</ZinePen>
    </button>
  </div>
</template>

<style scoped>
.zb { display: grid; gap: 12px; }
.zb.is-ruled { gap: 0; }
.zb-row { display: flex; align-items: center; gap: 14px; width: 100%; text-align: left; font-family: var(--font-display), sans-serif; font-weight: 800; font-stretch: 118%; font-size: 22px; color: rgb(var(--ink)); cursor: pointer; }
.is-ruled .zb-row { padding: 9px 0; border-bottom: 1.5px dashed rgb(var(--hair)); }
.zb-box { width: 22px; height: 22px; flex: none; border: 2.5px solid rgb(var(--ink)); transition: background-color 0.15s; }
.zb-row:hover .zb-box { background: rgb(var(--ink) / 0.15); }
.zb-box.is-on, .zb-row:hover .zb-box.is-on { background: rgb(var(--ink)); }
.zb-row:focus-visible { outline: 2px solid rgb(var(--gold)); outline-offset: 2px; }
</style>
