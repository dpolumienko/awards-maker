<script setup lang="ts">
// The platform's own mark, small, in its own colour. The glyphs are the library's
// (Infographics/icons/platforms/Fill, copied to assets/envelope/sys/pf-*.svg) -
// Ed, 2026-10-22: the Simple Icons paths drawn here before were not ours.
import { PLATFORM_NAMES, type PlatformId } from '~/data/platforms'
import twitch from '~/assets/envelope/sys/pf-twitch.svg?url'
import kick from '~/assets/envelope/sys/pf-kick.svg?url'
import youtube from '~/assets/envelope/sys/pf-youtube.svg?url'

const { platform, label = true, size = 12 } = defineProps<{ platform: PlatformId; label?: boolean; size?: number }>()
const SRC: Record<PlatformId, string> = { twitch, kick, youtube }
</script>

<template>
  <span class="inline-flex items-center gap-1.5">
    <img
      :src="SRC[platform]"
      :width="size"
      :height="size"
      class="block flex-none"
      :alt="label ? '' : PLATFORM_NAMES[platform]"
      :aria-hidden="label ? 'true' : undefined"
    />
    <span v-if="label" class="text-xs text-ink-2">{{ PLATFORM_NAMES[platform] }}</span>
  </span>
</template>
