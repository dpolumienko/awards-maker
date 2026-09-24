<script setup lang="ts">
// A date and a time, read in the show's zone - the value is a UTC instant.
// Same frame as UiField (label above, helper under). A date picked without a
// time takes `defaultTime`, so "voting closes 20 Dec" still means something.
import { computed, useId } from 'vue'
import { utcToZoned, zonedToUtc } from '#shared/time'

const {
  label,
  modelValue,
  timeZone,
  defaultTime = '00:00',
  helper = '',
  error = '',
} = defineProps<{
  label: string
  modelValue: string
  timeZone: string
  defaultTime?: string
  helper?: string
  error?: string
}>()
const emit = defineEmits<{ 'update:modelValue': [string] }>()

const id = useId()
const parts = computed(() => (modelValue ? utcToZoned(modelValue, timeZone) : { date: '', time: '' }))

function set(date: string, time: string) {
  emit('update:modelValue', date ? zonedToUtc(date, time || defaultTime, timeZone) : '')
}

const field =
  'h-12 w-full rounded-btn border bg-s2 px-4 text-base text-ink transition-colors focus:border-gold focus:shadow-focus focus:outline-none [color-scheme:dark]'
</script>

<template>
  <fieldset class="m-0 min-w-0 border-0 p-0">
    <legend class="label mb-2 block p-0">{{ label }}</legend>
    <div class="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-2">
      <input
        :id="`${id}-date`"
        type="date"
        :value="parts.date"
        :aria-label="`${label}, date`"
        :aria-invalid="error ? true : undefined"
        :aria-describedby="error || helper ? `${id}-note` : undefined"
        :class="[field, error ? 'border-danger' : 'border-hair2 hover:border-ink-muted']"
        @input="set(($event.target as HTMLInputElement).value, parts.time)"
      />
      <input
        :id="`${id}-time`"
        type="time"
        :value="parts.time"
        :disabled="!parts.date"
        :aria-label="`${label}, time`"
        :class="[field, 'disabled:opacity-40', error ? 'border-danger' : 'border-hair2 hover:border-ink-muted']"
        @input="set(parts.date, ($event.target as HTMLInputElement).value)"
      />
    </div>
    <p v-if="error" :id="`${id}-note`" class="mt-2 text-sm font-semibold text-danger">{{ error }}</p>
    <p v-else-if="helper" :id="`${id}-note`" class="mt-2 text-sm text-ink-muted">{{ helper }}</p>
  </fieldset>
</template>
