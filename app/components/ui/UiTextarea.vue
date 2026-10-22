<script setup lang="ts">
import { computed, useId } from 'vue'

const { label, modelValue, placeholder = '', helper = '', rows = 4, limit, error = '' } = defineProps<{
  label: string
  modelValue: string
  placeholder?: string
  helper?: string
  rows?: number
  /** Character budget, counted the way the name field counts it. */
  limit?: number
  /** replaces the helper and turns the field red, the way UiField does */
  error?: string
}>()
const near = computed(() => !!limit && modelValue.length >= limit * 0.8)
const over = computed(() => !!limit && modelValue.length > limit)
const emit = defineEmits<{ 'update:modelValue': [string] }>()
const id = useId()
</script>

<template>
  <div>
    <div class="mb-2 flex items-baseline justify-between gap-3">
      <label :for="id" class="label">{{ label }}</label>
      <span
        v-if="limit"
        class="tnum text-xs"
        :class="over ? 'text-danger' : near ? 'text-warn' : 'text-ink-muted'"
        aria-live="polite"
      >{{ modelValue.length }} / {{ limit }}</span>
    </div>
    <textarea
      :id="id"
      :rows="rows"
      :value="modelValue"
      :placeholder="placeholder"
      :aria-describedby="error ? `${id}-err` : helper ? `${id}-help` : undefined"
      :aria-invalid="error ? true : undefined"
      :maxlength="limit"
      class="w-full rounded-btn border bg-s2 px-4 py-3 text-base leading-relaxed text-ink transition-colors placeholder:text-ink-disabled focus:border-gold focus:shadow-focus focus:outline-none"
      :class="error ? 'border-danger' : 'border-hair hover:border-hair2'"
      @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    />
    <p v-if="error" :id="`${id}-err`" class="mt-2 text-sm font-semibold text-danger">{{ error }}</p>
    <p v-else-if="helper" :id="`${id}-help`" class="mt-2 text-sm text-ink-muted">{{ helper }}</p>
  </div>
</template>
