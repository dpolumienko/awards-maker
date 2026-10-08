<script setup lang="ts" generic="T extends string">
// A select in the house style (review 2026-10-08: the share cards' dropdowns
// were the browser's own). Label above, the field the height and border of
// UiField, our chevron instead of the platform's arrow. Still a native <select>:
// keyboard, screen readers and the phone's picker come with it.
import { useId } from 'vue'
import UiIcon from './UiIcon.vue'

defineProps<{ label: string; options: { value: T; label: string }[] }>()
const model = defineModel<T>({ required: true })
const id = useId()
</script>

<template>
  <div>
    <label :for="id" class="label mb-2 block">{{ label }}</label>
    <div class="relative">
      <select
        :id="id"
        v-model="model"
        class="h-12 w-full appearance-none rounded-btn border border-hair2 bg-s2 pl-4 pr-10 text-base text-ink transition-colors hover:border-ink-muted focus:border-gold focus:shadow-focus focus:outline-none"
      >
        <option v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</option>
      </select>
      <UiIcon name="chevron-down" :size="16" class="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink-muted" />
    </div>
  </div>
</template>
