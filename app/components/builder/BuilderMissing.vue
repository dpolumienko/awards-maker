<script setup lang="ts">
// What a step still needs, on the step itself - Night v2 only (review
// 2026-10-08: a Missing stamp on the ticket has to say what is missing where it
// is fixed). Shown once you come back to a step you left short; each line takes
// you to its field, and the fields themselves turn red.
defineProps<{ items: { id: string; label: string }[] }>()
const emit = defineEmits<{ fix: [string] }>()
// Envelope (Ed, 2026-10-22): a calm note, not a stamp - what is left, and a way to each field
</script>

<template>
  <div class="ebm" role="status">
    <span class="ebm-i" aria-hidden="true">!</span>
    <b class="ebm-b">{{ items.length === 1 ? 'Left to fill in:' : `${items.length} left to fill in:` }}</b>
    <ul>
      <li v-for="i in items" :key="i.id">
        <button type="button" @click="emit('fix', i.id)">{{ i.label }}<i aria-hidden="true" /></button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
</style>
