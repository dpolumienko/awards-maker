<script setup lang="ts">
// The picture of an image or clip nominee, wherever one is listed: the ballot,
// the builder's list and its preview (review 2026-10-06: clips had no preview at
// all, images did).
//
// Where the frame comes from (utils/clip.ts has the platform notes):
//   image             - the upload itself
//   Kick, YouTube     - the poster each CDN publishes next to the clip
//   Kick by bare id   - the same, once kick.com/api resolves the id (from the browser)
//   Twitch            - its API, through our server (server/api/clip-poster).
//                       The static demo has no server, so a Twitch clip keeps the
//                       clip mark there - never the embedded player, whose play
//                       button and chrome read as broken (review 2026-10-08).
// A link nothing can be read from keeps the clip mark.
import { computed, onMounted, ref } from 'vue'
import type { Nominee } from '~/types/award'
import { clipSource, resolveKickClip } from '~/utils/clip'
import { nomineeImage } from '~/utils/nominee'
import UiMaskIcon from './UiMaskIcon.vue'

const { nominee, width } = defineProps<{ nominee: Nominee; /** px; the height is 16:9 of it */ width: number }>()

const clip = computed(() => (nominee.kind === 'media' && !nominee.image && nominee.url ? clipSource(nominee.url) : null))
const resolved = ref('')
const src = computed(() => nomineeImage(nominee) || resolved.value)
const failed = ref(false)

onMounted(async () => {
  if (src.value || !clip.value?.kickId) return
  resolved.value = (await resolveKickClip(clip.value.kickId))?.poster ?? ''
})
</script>

<template>
  <span
    aria-hidden="true"
    class="relative block flex-none overflow-hidden rounded-btn bg-s3"
    :style="{ width: `${width}px`, height: `${Math.round((width * 9) / 16)}px` }"
  >
    <img v-if="src && !failed" :src="src" alt="" loading="lazy" class="h-full w-full object-cover" @error="failed = true" />
    <span v-else class="grid h-full w-full place-items-center">
      <UiMaskIcon src="/img/icons/cat-clip.svg" class="h-1/2 w-1/2 text-ink-muted" />
    </span>
    <!-- a clip says it plays -->
    <span v-if="clip" class="absolute bottom-1 left-1 grid h-4 w-4 place-items-center rounded-pill bg-black/70 text-[8px] text-white">&#9654;</span>
  </span>
</template>
