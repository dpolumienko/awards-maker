<script setup lang="ts">
// What a step still needs, on the step itself - Night v2 only (review
// 2026-10-08: a Missing stamp on the ticket has to say what is missing where it
// is fixed). Shown once you come back to a step you left short; each line takes
// you to its field, and the fields themselves turn red.
defineProps<{ items: { id: string; label: string }[] }>()
const emit = defineEmits<{ fix: [string] }>()
</script>

<template>
  <div class="bm" role="status">
    <span class="bm-stamp" aria-hidden="true">Missing</span>
    <p class="sr-only">Missing on this step:</p>
    <ul>
      <li v-for="i in items" :key="i.id">
        <button type="button" @click="emit('fix', i.id)">{{ i.label }}</button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.bm { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 20px; padding: 14px 16px; border: 2px dashed rgb(var(--danger)); background: rgb(var(--danger) / 0.06); }
.bm-stamp { padding: 3px 8px 2px; border: 3px double rgb(var(--danger)); color: rgb(var(--danger)); font: 800 12px/1.2 var(--font-display), sans-serif; letter-spacing: 0.06em; text-transform: uppercase; transform: rotate(-4deg); }
.bm ul { display: flex; flex-wrap: wrap; gap: 8px 18px; margin: 0; padding: 0; list-style: none; }
.bm button { font-size: 14px; font-weight: 700; color: rgb(var(--ink)); text-decoration: underline; text-decoration-color: rgb(var(--danger)); text-decoration-thickness: 2px; text-underline-offset: 4px; }
.bm button:hover { color: rgb(var(--danger)); }
.bm button:focus-visible { outline: 3px solid rgb(var(--gold)); outline-offset: 2px; }
</style>
