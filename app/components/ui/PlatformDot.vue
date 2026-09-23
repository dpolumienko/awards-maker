<script setup lang="ts">
// Platform cue without reproducing anyone's logo: the colour does the work.
// Twitch purple, Kick green, YouTube red are the three we say out loud - and they
// live in data/platforms.ts, which is also where Tailwind reads them from.
import { PLATFORM_COLORS, PLATFORM_NAMES, type PlatformId } from '~/data/platforms'

const { platform, label = true } = defineProps<{ platform: PlatformId; label?: boolean }>()
</script>

<template>
  <span class="inline-flex items-center gap-1.5">
    <span aria-hidden="true" class="block h-2 w-2 flex-none rounded-pill" :style="{ background: PLATFORM_COLORS[platform] }" />
    <span v-if="label" class="text-xs text-ink-2">{{ PLATFORM_NAMES[platform] }}</span>
  </span>
</template>
