<script setup lang="ts">
// Every labelled "Remove" in the product, in one place. Removing a nomination
// and removing a partner behaved differently - one asked, one just did it - and
// the show list asked with a third wording again.
//
// The label never changes width: the longest of the two strings is rendered
// invisibly underneath, so the row does not shuffle when the button arms.
import { useArm } from '~/composables/useArm'

const {
  label = 'Remove',
  confirmLabel = 'Remove - sure?',
  ariaLabel,
  confirmAriaLabel,
  variant = 'box',
} = defineProps<{
  label?: string
  confirmLabel?: string
  ariaLabel?: string
  confirmAriaLabel?: string
  /** `box` sits in a form row; `quiet` is a text link inside a list row. */
  variant?: 'box' | 'quiet'
}>()

const emit = defineEmits<{ confirm: [] }>()
const { isArmed, arm } = useArm()

function onClick() {
  if (arm()) emit('confirm')
}

const shape = {
  box: 'h-11 flex-none rounded-btn border px-3 text-sm',
  quiet: 'text-sm underline underline-offset-4',
} as const

const tone = {
  box: {
    idle: 'border-hair text-ink-muted hover:border-danger hover:text-danger',
    armed: 'border-danger bg-danger/10 text-danger',
  },
  quiet: { idle: 'text-ink-muted hover:text-danger', armed: 'text-danger' },
} as const
</script>

<template>
  <button
    type="button"
    class="transition-colors"
    :class="[shape[variant], isArmed() ? tone[variant].armed : tone[variant].idle]"
    :aria-label="isArmed() ? (confirmAriaLabel ?? ariaLabel) : ariaLabel"
    @click="onClick"
  >
    <span class="grid">
      <span aria-hidden="true" class="invisible col-start-1 row-start-1">
        {{ label.length > confirmLabel.length ? label : confirmLabel }}
      </span>
      <span class="col-start-1 row-start-1">{{ isArmed() ? confirmLabel : label }}</span>
    </span>
  </button>
</template>
