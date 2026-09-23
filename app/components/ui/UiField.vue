<script setup lang="ts">
// Text input per DESIGN.md §4: label above, helper or error under, optional counter.
import { computed, useId } from 'vue'

const {
  label,
  modelValue,
  placeholder = '',
  helper = '',
  error = '',
  warning = '',
  limit = 0,
  type = 'text',
} = defineProps<{
  label: string
  modelValue: string
  placeholder?: string
  helper?: string
  error?: string
  warning?: string
  limit?: number
  type?: string
}>()
const emit = defineEmits<{ 'update:modelValue': [string] }>()

const id = useId()
const used = computed(() => modelValue.length)
const counterTone = computed(() => {
  if (!limit) return ''
  if (used.value > limit) return 'text-danger'
  if (used.value >= limit * 0.8) return 'text-warn'
  return 'text-ink-muted'
})
const describedBy = computed(() => [error && `${id}-err`, warning && `${id}-warn`, helper && `${id}-help`].filter(Boolean).join(' ') || undefined)
</script>

<template>
  <div>
    <label :for="id" class="label mb-2 block">{{ label }}</label>
    <input
      :id="id"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :aria-invalid="error ? true : undefined"
      :aria-describedby="describedBy"
      class="h-12 w-full rounded-btn border bg-s2 px-4 text-base text-ink transition-colors placeholder:text-ink-disabled focus:border-gold focus:shadow-focus focus:outline-none"
      :class="error ? 'border-danger' : 'border-hair hover:border-hair2'"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <div class="mt-2 flex items-start gap-3">
      <p v-if="error" :id="`${id}-err`" class="text-sm font-semibold text-danger">{{ error }}</p>
      <p v-else-if="warning" :id="`${id}-warn`" class="text-sm text-warn">{{ warning }}</p>
      <p v-else-if="helper" :id="`${id}-help`" class="text-sm text-ink-muted">{{ helper }}</p>
      <p v-if="limit" class="tnum ml-auto shrink-0 text-sm" :class="counterTone" aria-live="polite">
        {{ used }} / {{ limit }}
      </p>
    </div>
  </div>
</template>
