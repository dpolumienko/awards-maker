<script setup lang="ts">
// One clip, playing in our page - the lightbox on the ballot and the winner's
// screen at the ceremony (review 2026-10-08: "the clip should play, not sit there
// as a picture") both use it.
//
// Kick clips play in our own <video> off Kick's CDN, the way the clips page on
// Streams Charts does it; Twitch and YouTube come in through their own embeds.
// It starts when it is mounted. `autoplay` starts it without a click - the
// ceremony is advanced by a click, which is the gesture browsers want for sound.
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { clipSource, resolveKickClip } from '~/utils/clip'

const { url, title, autoplay = false } = defineProps<{ url: string; title: string; autoplay?: boolean }>()

const clip = computed(() => clipSource(url))
const video = ref<HTMLVideoElement | null>(null)
const poster = ref('')
const failed = ref(false)
let hls: { destroy: () => void } | null = null

// the platform players take autoplay as a parameter
const embed = computed(() => {
  const src = clip.value?.embed
  if (!src || !autoplay) return src
  const u = new URL(src)
  u.searchParams.set('autoplay', clip.value?.platform === 'youtube' ? '1' : 'true')
  return u.toString()
})

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
    // 404s or fails CORS never reaches the <video>, and an <video> with no source
    // paints the canvas colour.
    instance.on(Hls.Events.ERROR, (_e, data) => {
      if (data.fatal) failed.value = true
    })
    instance.loadSource(playlist)
    instance.attachMedia(el)
    hls = instance
  } else if (el.canPlayType('application/vnd.apple.mpegurl')) {
    el.src = playlist
  } else {
    failed.value = true
    return
  }
  if (autoplay) el.play().catch(() => {})
}

onMounted(async () => {
  const c = clip.value
  if (!c) return
  if (c.hls) {
    poster.value = c.poster ?? ''
    await play(c.hls)
  } else if (c.kickId) {
    // the shard is only in Kick's API; a link from our own clips page has it already
    const resolved = await resolveKickClip(c.kickId)
    if (!resolved) {
      failed.value = true
      return
    }
    poster.value = resolved.poster ?? ''
    await play(resolved.hls)
  }
})
onBeforeUnmount(() => hls?.destroy())
</script>

<template>
  <div class="aspect-video w-full bg-black">
    <p v-if="failed" class="grid h-full place-items-center px-6 text-center text-sm text-ink-2">
      This clip would not play here. It still works on {{ clip?.label }}.
    </p>
    <!-- our own player for a Kick clip -->
    <video
      v-else-if="clip?.hls || clip?.kickId"
      ref="video"
      class="h-full w-full"
      controls
      playsinline
      :poster="poster || undefined"
    />
    <!-- the platform's own player, in our page -->
    <iframe
      v-else-if="embed"
      :src="embed"
      :title="title"
      class="h-full w-full border-0"
      allowfullscreen
      allow="autoplay; fullscreen; encrypted-media; picture-in-picture; keyboard-map"
      referrerpolicy="strict-origin-when-cross-origin"
    />
    <p v-else class="grid h-full place-items-center px-6 text-center text-sm text-ink-2">This one only opens where it was posted.</p>
  </div>
</template>
