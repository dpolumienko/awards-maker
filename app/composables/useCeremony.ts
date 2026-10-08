import { computed, ref, watch } from 'vue'
import type { Award } from '~/types/award'

// How a ceremony is dressed. Stored against the show now instead of against the
// browser, so a host can set it up on a laptop and run it from the studio machine.

export const REVEALS = [
  { id: 'cut', label: 'Cut', note: 'The name lands in one frame. Reads best on a busy stream.' },
  { id: 'spotlight', label: 'Spotlight', note: 'A light finds the winner, then the name.' },
  { id: 'flip', label: 'Flip', note: 'The plate turns over, like a board at an airport.' },
  // review 2026-10-08: more ways to arrive (utils/revealMotion draws them all)
  { id: 'slot', label: 'Slot machine', note: 'The names roll past and stop on the winner.' },
  { id: 'stamp', label: 'Stamp', note: 'The name slams down and the screen takes the knock.' },
  { id: 'typewriter', label: 'Typewriter', note: 'The name types itself out, letter by letter.' },
  { id: 'curtain', label: 'Curtain', note: 'The name opens from the middle out.' },
] as const
export type RevealStyle = (typeof REVEALS)[number]['id']
export const REVEAL_IDS = REVEALS.map((r) => r.id) as [RevealStyle, ...RevealStyle[]]

export interface CeremonySettings {
  stage: string
  font: string
  reveal: RevealStyle
  /** the host's own picture for the stage (stage = IMAGE) */
  image?: string
  /** the show's partners in a corner of every slide - on unless switched off */
  partners: boolean
  /** the vote count and percentage on the winner's screen - on unless switched off */
  counts: boolean
}

export const CEREMONY_FONTS = ['Archivo', 'Anton', 'Playfair Display', 'Space Grotesk']

/** The stage that is the host's own cover rather than one of ours. */
export const COVER = 'cover'
/** The stage that is a picture uploaded in the setup itself (review 2026-10-08). */
export const IMAGE = 'image'

/** The picture behind the stage, if the chosen stage is one. */
export function stageImage(s: CeremonySettings, cover?: string) {
  return s.stage === COVER ? cover || undefined : s.stage === IMAGE ? s.image || undefined : undefined
}

export function useCeremony(slug: () => string, award: () => Award | null) {
  const stored = ref<CeremonySettings | null>(null)
  const configured = computed(() => stored.value !== null)

  /** Falls back to the show's own Look, so an unconfigured ceremony still fits. */
  const settings = computed<CeremonySettings>(() => ({
    stage: stored.value?.stage ?? (award()?.look?.coverUrl ? COVER : (award()?.look?.theme ?? 'stage')),
    font: stored.value?.font ?? award()?.look?.font ?? 'Anton',
    reveal: stored.value?.reveal ?? 'cut',
    image: stored.value?.image,
    partners: stored.value?.partners ?? true,
    counts: stored.value?.counts ?? true,
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
