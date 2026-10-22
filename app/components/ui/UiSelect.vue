<script setup lang="ts" generic="T extends string">
// A select in the house style: the prototype's own dropdown (EnvSelect, .dd),
// not the browser's - the native list opened in the system's blue and white
// (Ed, 2026-10-22). Label above; the .env-cr wrapper carries the dropdown's look.
import { computed, useId } from 'vue'
import EnvSelect from '~/components/envelope/EnvSelect.vue'
import '~/assets/css/envelope-cr.css'

const props = defineProps<{ label: string; options: { value: T; label: string }[] }>()
const model = defineModel<T>({ required: true })
const id = useId()
const opts = computed(() => props.options.map((o) => ({ id: o.value as string, label: o.label })))
</script>

<template>
  <div class="env-cr ui-sel">
    <span :id="id" class="label mb-2 block">{{ label }}</span>
    <EnvSelect :model-value="model" :options="opts" :labelledby="id" @update:model-value="model = $event as T" />
  </div>
</template>
