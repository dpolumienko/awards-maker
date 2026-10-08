<script setup lang="ts">
// The two doors every sign-in offers: Twitch or Kick (review 2026-10-06, Kick
// login as on Streams Charts). Only the buttons - which door leads where (voter
// or host consent, picks parked first) is the caller's business, so the header,
// the builder and the ballot all use this one pair.
import type { SignInProvider } from '~/composables/useAccount'

const { label = 'Sign in with', disabled = false, block = false } = defineProps<{
  label?: string
  disabled?: boolean
  /** stretch to the row, for the phone menu and the ballot bar */
  block?: boolean
}>()
const emit = defineEmits<{ choose: [SignInProvider] }>()

const base =
  'flex min-h-11 items-center justify-center rounded-btn px-4 py-2 text-[13px] font-bold uppercase tracking-button transition-opacity hover:opacity-90 disabled:opacity-40'
</script>

<template>
  <div class="flex flex-wrap gap-2" :class="block && 'w-full'">
    <button type="button" :class="[base, block && 'flex-1', 'bg-twitch text-white']" :disabled="disabled" :aria-label="label ? undefined : 'Sign in with Twitch'" @click="emit('choose', 'twitch')">
      {{ label }} Twitch
    </button>
    <!-- Kick's own green carries black type, as Kick prints it -->
    <button type="button" :class="[base, block && 'flex-1', 'bg-kick text-black']" :disabled="disabled" :aria-label="label ? undefined : 'Sign in with Kick'" @click="emit('choose', 'kick')">
      {{ label }} Kick
    </button>
  </div>
</template>
