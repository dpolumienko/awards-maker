import { computed, ref, watch } from 'vue'
import type { Award } from '~/types/award'

// How a ceremony is dressed. Stored against the show now instead of against the
// browser, so a host can set it up on a laptop and run it from the studio machine.

export type RevealStyle = 'cut' | 'spotlight' | 'flip'

export interface CeremonySettings {
  stage: string
  font: string
  reveal: RevealStyle
}

export const REVEALS: { id: RevealStyle; label: string; note: string }[] = [
  { id: 'cut', label: 'Cut', note: 'The name lands in one frame. Reads best on a busy stream.' },
  { id: 'spotlight', label: 'Spotlight', note: 'A light finds the winner, then the name.' },
  { id: 'flip', label: 'Flip', note: 'The plate turns over, like a board at an airport.' },
]

export const CEREMONY_FONTS = ['Archivo', 'Anton', 'Playfair Display', 'Space Grotesk']

/** The stage that is the host's own cover rather than one of ours. */
export const COVER = 'cover'

export function useCeremony(slug: () => string, award: () => Award | null) {
  const stored = ref<CeremonySettings | null>(null)
  const configured = computed(() => stored.value !== null)

  /** Falls back to the show's own Look, so an unconfigured ceremony still fits. */
  const settings = computed<CeremonySettings>(() => ({
    stage: stored.value?.stage ?? (award()?.look?.coverUrl ? COVER : (award()?.look?.theme ?? 'stage')),
    font: stored.value?.font ?? award()?.look?.font ?? 'Anton',
    reveal: stored.value?.reveal ?? 'cut',
  }))

  async function load() {
    if (!slug()) return
    try {
      const res = await $fetch<{ ceremony: CeremonySettings | null }>(
        `/api/awards/${encodeURIComponent(slug())}/ceremony`,
      )
      stored.value = res.ceremony
    } catch {
      stored.value = null
    }
  }

  async function update(patch: Partial<CeremonySettings>) {
    const next: CeremonySettings = { ...settings.value, ...patch }
    stored.value = next
    try {
      await $fetch(`/api/awards/${encodeURIComponent(slug())}/ceremony`, { method: 'PUT', body: next })
    } catch {
      // the screen keeps the setting for this run either way; the host is mid-show
    }
  }

  watch(slug, load, { immediate: import.meta.client })

  return { settings, update, configured, load }
}
