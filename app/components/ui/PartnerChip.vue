<script setup lang="ts">
// A partner reads better with its own mark on it. We pull the favicon straight
// from the link the streamer gave - the request goes to the partner's own domain,
// not through a third-party icon service, so nobody's visitors get logged
// somewhere else. Anything missing or broken falls back to the initial.
// With a backend this gets fetched and cached on our side; the shape stays.
import { tint } from '~/utils/accent'
import { computed, ref } from 'vue'
import type { Partner } from '~/types/award'

const { partner, accent } = defineProps<{ partner: Partner; accent: string }>()

const failed = ref(false)
const host = computed(() => {
  const raw = partner.url?.trim()
  if (!raw) return ''
  try {
    return new URL(raw.startsWith('http') ? raw : `https://${raw}`).host
  } catch {
    return ''
  }
})
const icon = computed(() => (host.value && !failed.value ? `https://${host.value}/favicon.ico` : ''))
// Only an http(s) address becomes a link - never javascript: or data:, whatever
// is stored. A bare domain is read as https (the API normalises new ones).
const href = computed(() => {
  const raw = partner.url?.trim() ?? ''
  if (!raw) return ''
  if (/^https?:\/\//i.test(raw)) return raw
  return /^[a-z][a-z0-9+.-]*:/i.test(raw) ? '' : `https://${raw}`
})
const tag = computed(() => (href.value ? 'a' : 'span'))
</script>

<template>
  <component
    :is="tag"
    :href="href || undefined"
    :target="href ? '_blank' : undefined"
    :rel="href ? 'nofollow sponsored noopener' : undefined"
    class="inline-flex items-center gap-2 rounded-pill border py-1.5 pl-1.5 pr-3.5 text-sm text-ink-2 no-underline transition-colors hover:text-ink"
    :style="{ borderColor: tint(accent, '66') }"
  >
    <img
      v-if="icon"
      :src="icon"
      alt=""
      aria-hidden="true"
      class="h-5 w-5 flex-none rounded-pill object-contain"
      loading="lazy"
      @error="failed = true"
    />
    <span
      v-else
      aria-hidden="true"
      class="grid h-5 w-5 flex-none place-items-center rounded-pill bg-s3 text-[11px] font-bold text-ink-muted"
    >{{ partner.name.trim().slice(0, 1).toUpperCase() }}</span>
    {{ partner.name }}
  </component>
</template>
