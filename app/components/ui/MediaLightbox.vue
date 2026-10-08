<script setup lang="ts">
// A nominee that is an image or a clip has to be seen before it can be voted on.
// A 64px thumb in a ballot row is a label, not the thing - so both open here.
//
// The clip plays in ClipPlayer (Kick off its CDN, Twitch and YouTube through
// their embeds). Whatever happens, the link out stays under the player.
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import UiIcon from './UiIcon.vue'
import ClipPlayer from './ClipPlayer.vue'
import { clipSource } from '~/utils/clip'

const { open, src = '', url = '', title } = defineProps<{
  open: boolean
  /** An uploaded image. */
  src?: string
  /** A clip link, if that is what the nominee is. */
  url?: string
  title: string
}>()
const emit = defineEmits<{ close: [] }>()

const clip = computed(() => (url ? clipSource(url) : null))
const closeBtn = ref<HTMLButtonElement | null>(null)
let returnTo: HTMLElement | null = null

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && open) emit('close')
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

watch(
  () => open,
  async (isOpen) => {
    if (!isOpen) {
      returnTo?.focus()
      return
    }
    returnTo = document.activeElement as HTMLElement
    await nextTick()
    closeBtn.value?.focus()
  },
)
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 grid place-items-center bg-black/85 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      :aria-label="title"
      @click.self="emit('close')"
    >
      <div class="max-h-full w-full max-w-3xl overflow-hidden rounded-card border border-hair bg-s1">
        <div class="flex items-center gap-4 border-b border-hair px-5 py-3">
          <p class="truncate font-semibold">{{ title }}</p>
          <button
            ref="closeBtn"
            type="button"
            class="ml-auto grid h-9 w-9 flex-none place-items-center rounded-btn border border-hair text-ink-2 transition-colors hover:border-gold hover:text-ink"
            aria-label="Close"
            @click="emit('close')"
          >
            <UiIcon name="close" />
          </button>
        </div>

        <ClipPlayer v-if="clip" :url="url" :title="title" />
        <img v-else-if="src" :src="src" :alt="title" class="max-h-[75vh] w-full bg-canvas object-contain" />
        <div v-else class="grid place-items-center bg-canvas px-6 py-16 text-center text-sm text-ink-2">
          This one only opens where it was posted.
        </div>

        <p v-if="clip" class="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-hair px-5 py-3 text-sm text-ink-muted">
          <a
            :href="clip.href"
            target="_blank"
            rel="nofollow noopener"
            class="inline-flex items-center gap-1 text-gold-text underline underline-offset-4"
          >
            Open on {{ clip.label }}
            <UiIcon name="chevron-right" :size="12" />
          </a>
        </p>
      </div>
    </div>
  </Teleport>
</template>
