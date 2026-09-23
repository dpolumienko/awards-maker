import { computed, ref } from 'vue'
import type { Award } from '~/types/award'

/**
 * How one host wants their ceremony to look and move. Separate from the awards'
 * Look on purpose: the page is for voters, the ceremony is for a stream, and a
 * stage that reads well in a browser tab is not always the one that reads on a
 * 1080p capture behind a webcam.
 *
 * Defaults come from the awards itself, so a host who never opens the setup gets
 * their own colours anyway.
 */
export interface CeremonySettings {
  /** Background treatment, ids from data/themes. */
  stage: string
  /** Display face for the names. */
  font: string
  /** How a winner arrives. */
  reveal: RevealStyle
}
export type RevealStyle = 'cut' | 'spotlight' | 'flip'

export const REVEALS: { id: RevealStyle; name: string; blurb: string }[] = [
  { id: 'cut', name: 'Cut', blurb: 'The name climbs into place letter by letter.' },
  { id: 'spotlight', name: 'Spotlight', blurb: 'The room dims, one light finds the winner.' },
  { id: 'flip', name: 'Flip', blurb: 'The board turns over, the way a scoreboard does.' },
]

export const CEREMONY_FONTS = ['Anton', 'Archivo', 'Playfair Display', 'Space Grotesk']

const KEY = 'awards-maker:ceremony'
const all = ref<Record<string, CeremonySettings>>({})
let hydrated = false

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(all.value))
  } catch {
    /* private window - the settings last for this session */
  }
}

export function useCeremony(slug: () => string, award: () => Award | null) {
  if (import.meta.client && !hydrated) {
    hydrated = true
    try {
      all.value = JSON.parse(localStorage.getItem(KEY) || '{}')
    } catch {
      all.value = {}
    }
  }

  const settings = computed<CeremonySettings>(() => ({
    stage: all.value[slug()]?.stage ?? award()?.look?.theme ?? 'stage',
    font: all.value[slug()]?.font ?? award()?.look?.font ?? 'Anton',
    reveal: all.value[slug()]?.reveal ?? 'cut',
  }))

  /** Has this awards been through the setup, or are these still the defaults? */
  const configured = computed(() => !!all.value[slug()])

  function update(patch: Partial<CeremonySettings>) {
    all.value = { ...all.value, [slug()]: { ...settings.value, ...patch } }
    save()
  }

  return { settings, update, configured }
}
