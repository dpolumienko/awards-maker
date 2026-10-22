<script setup lang="ts">
// One "Sign in" in the Envelope header (Ed, 2026-10-22): the platforms come up in
// a popup instead of sitting in the bar as two coloured buttons.
import { nextTick, ref, watch } from 'vue'
import type { SignInProvider } from '~/composables/useAccount'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: []; choose: [SignInProvider] }>()
const first = ref<HTMLButtonElement | null>(null)
let last: Element | null = null
watch(
  () => props.open,
  async (o) => {
    if (!import.meta.client) return
    if (o) {
      last = document.activeElement
      await nextTick()
      first.value?.focus()
    } else (last as HTMLElement | null)?.focus?.()
  },
)
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="esi" role="dialog" aria-modal="true" aria-labelledby="esi-h" @click.self="emit('close')" @keydown.esc="emit('close')">
      <div class="esi-box">
        <button type="button" class="esi-x" aria-label="Close" @click="emit('close')" />
        <h2 id="esi-h">Sign in</h2>
        <p>Use the account you stream or watch with. We only read your channel name and avatar.</p>
        <div class="esi-list">
          <button ref="first" type="button" class="esi-p tw" @click="emit('choose', 'twitch')"><i aria-hidden="true" />Continue with Twitch</button>
          <button type="button" class="esi-p kk" @click="emit('choose', 'kick')"><i aria-hidden="true" />Continue with Kick</button>
        </div>
        <small>By signing in you agree to the <a href="https://streamscharts.com/terms" target="_blank" rel="noopener">Terms of Use</a>.</small>
      </div>
    </div>
  </Teleport>
</template>
