<script setup lang="ts">
// "Something wrong with this page?" - the report form of a public awards page.
// A card beside the ballot, or one quiet line under it (the Envelope version).
// A report does not need an account: somebody who has just been impersonated
// should not have to sign in to say so. The endpoint checks the origin instead.
import { ref } from 'vue'

const { slug, variant = 'card' } = defineProps<{ slug: string; variant?: 'card' | 'line' }>()

const open = ref(false)
const reported = ref(false)
const text = ref('')
async function send() {
  // an empty report is not a report - the button is disabled, this is the Enter key
  if (!text.value.trim()) return
  try {
    await $fetch('/api/reports', { method: 'POST', body: { slug, reason: text.value } })
  } catch {
    // saying "sent" either way: a failed report is not the reporter's problem to
    // solve, and the alternative is an error dialog over an accusation
  }
  reported.value = true
  open.value = false
}
</script>

<template>
  <div :class="variant === 'card' ? 'rounded-card border border-hair bg-s1 p-5' : 'report-line'">
    <p v-if="variant === 'card'" class="label">Something wrong with this page?</p>
    <p v-if="reported" class="mt-2 text-sm text-live">Reported. Our moderators pick it up from the queue.</p>
    <template v-else>
      <p :class="variant === 'card' ? 'mt-2 text-sm text-ink-2' : 'inline'">
        Awards are made by streamers, not by us.<template v-if="variant === 'card'"> Anything abusive or stolen goes to our moderation queue.</template>
      </p>
      <button
        v-if="!open"
        type="button"
        :class="variant === 'card' ? 'mt-3 text-sm text-ink-muted underline underline-offset-4 transition-colors hover:text-danger' : 'link'"
        @click="open = true"
      >
        Report this awards
      </button>
      <form v-else class="mt-3 text-left" @submit.prevent="send">
        <label class="label" :for="`report-reason-${variant}`">What is wrong</label>
        <textarea
          :id="`report-reason-${variant}`"
          v-model="text"
          rows="3"
          class="mt-2 w-full rounded-btn border border-hair bg-canvas p-3 text-sm"
          placeholder="Harassment, stolen content, impersonation..."
        />
        <div class="mt-3 flex gap-3">
          <button
            type="submit"
            :disabled="!text.trim()"
            class="h-10 rounded-btn border border-hair px-4 text-sm font-bold uppercase tracking-button transition-colors hover:border-danger hover:text-danger disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-hair disabled:hover:text-ink"
          >
            Send report
          </button>
          <button type="button" class="text-sm text-ink-muted underline underline-offset-4" @click="open = false">Cancel</button>
        </div>
      </form>
    </template>
  </div>
</template>
