<script setup lang="ts">
// Sharing is the whole growth loop for this product, so it sits on the page
// itself, not behind a menu. Share images are a later card - this is the link.
import { ref } from 'vue'

const { url, text } = defineProps<{ url: string; text: string }>()
const copied = ref(false)

async function copy() {
  try {
    await navigator.clipboard.writeText(url)
    copied.value = true
    setTimeout(() => (copied.value = false), 2400)
  } catch {
    /* clipboard blocked - the address bar still has the link */
  }
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-3">
    <button
      type="button"
      class="h-11 rounded-btn border border-hair px-4 text-sm font-bold uppercase tracking-button transition-colors hover:border-gold hover:text-gold-text"
      @click="copy"
    >
      <span class="grid">
        <span aria-hidden="true" class="col-start-1 row-start-1 invisible">Link copied</span>
        <span class="col-start-1 row-start-1">{{ copied ? 'Link copied' : 'Copy link' }}</span>
      </span>
    </button>
    <a
      :href="'https://x.com/intent/post?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent(url)"
      target="_blank"
      rel="noopener"
      class="flex h-11 items-center rounded-btn border border-hair px-4 text-sm font-bold uppercase tracking-button no-underline transition-colors hover:border-gold hover:text-gold-text"
    >
      Share on X
    </a>
    <span aria-live="polite" class="sr-only">{{ copied ? 'Link copied to clipboard' : '' }}</span>
  </div>
</template>
