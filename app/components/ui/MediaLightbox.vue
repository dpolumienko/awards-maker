<script setup lang="ts">
// A nominee that is an image or a clip has to be seen before it can be voted on.
// A 64px thumb in a ballot row is a label, not the thing - so both open here.
//
// Kick clips play in our own <video> off Kick's CDN, the way the clips page on
// Streams Charts does it; Twitch and YouTube come in through their own embeds.
// Whatever happens, the link out stays under the player.
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import UiIcon from './UiIcon.vue'
import { clipSource, resolveKickClip } from '~/utils/clip'

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
const video = ref<HTMLVideoElement | null>(null)
const hlsUrl = ref('')
const poster = ref('')
const failed = ref(false)
let hls: { destroy: () => void } | null = null
let returnTo: HTMLElement | null = null

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && open) emit('close')
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  teardown()
})

function teardown() {
  hls?.destroy()
  hls = null
  hlsUrl.value = ''
  poster.value = ''
  failed.value = false
}

/**
 * hls.js first, native HLS only where it is the real thing. Chromium answers
 * "maybe" to canPlayType('application/vnd.apple.mpegurl') and then fails the
 * media with error 4, so asking the element first is how this breaks.
 */
async function play(playlist: string) {
  await nextTick()
  const el = video.value
  if (!el) return
  const { default: Hls } = await import('hls.js')
  if (Hls.isSupported()) {
    const instance = new Hls({ enableWorker: true })
    // Without this the player was a permanent black rectangle: a manifest that
    // 404s or fails CORS never reaches the <video>, `failed` was only ever set on
    // the Kick-API path, and an <video> with no source paints the canvas colour.
    instance.on(Hls.Events.ERROR, (_e, data) => {
      if (data.fatal) failed.value = true
    })
    instance.loadSource(playlist)
    instance.attachMedia(el)
    hls = instance
    return
  }
  if (el.canPlayType('application/vnd.apple.mpegurl')) {
    el.src = playlist
    return
  }
  failed.value = true
}

watch(
  () => open,
  async (isOpen) => {
    if (!isOpen) {
      teardown()
      returnTo?.focus()
      return
    }
    returnTo = document.activeElement as HTMLElement
    await nextTick()
    closeBtn.value?.focus()

    const c = clip.value
    if (!c) return
    if (c.hls) {
      poster.value = c.poster ?? ''
      hlsUrl.value = c.hls
      await play(c.hls)
    } else if (c.kickId) {
      // the shard is only in Kick's API; a link from our own clips page has it already
      const resolved = await resolveKickClip(c.kickId)
      if (!resolved) {
        failed.value = true
        return
      }
      poster.value = resolved.poster ?? ''
      hlsUrl.value = resolved.hls
      await play(resolved.hls)
    }
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

        <!-- our own player for a Kick clip -->
        <video
          v-if="clip?.hls || clip?.kickId"
          v-show="!failed"
          ref="video"
          class="aspect-video w-full bg-canvas"
          controls
          playsinline
          :poster="poster || undefined"
        />
        <!-- the platform's own player, in our page -->
        <div v-else-if="clip?.embed" class="aspect-video w-full bg-canvas">
          <iframe
            :src="clip.embed"
            :title="title"
            class="h-full w-full border-0"
            allowfullscreen
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture; keyboard-map"
            referrerpolicy="strict-origin-when-cross-origin"
          />
        </div>
        <img v-else-if="src" :src="src" :alt="title" class="max-h-[75vh] w-full bg-canvas object-contain" />
        <div v-else class="grid place-items-center bg-canvas px-6 py-16 text-center text-sm text-ink-2">
          This one only opens where it was posted.
        </div>

        <p v-if="failed" class="bg-canvas px-6 py-10 text-center text-sm text-ink-2">
          This clip would not play here. It still works on {{ clip?.label }}.
        </p>

        <p v-if="clip" class="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-hair px-5 py-3 text-sm text-ink-muted">
          <span v-if="!failed && (clip.embed || hlsUrl)">Playing from {{ clip.label }}.</span>
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
