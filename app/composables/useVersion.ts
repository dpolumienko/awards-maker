import { computed } from 'vue'

const ENVELOPE_FONTS = 'https://fonts.googleapis.com/css2?family=Gloock&family=Hanken+Grotesk:wght@400;500;600;700&display=swap'

/**
 * The site has one version now, Envelope (2026-10-22: the others were retired).
 * Kept as a composable so the flags read the same everywhere while the old
 * branches are being removed.
 */
export function useVersion() {
  const no = computed(() => false)
  return { version: computed(() => 'envelope' as const), isEnvelope: computed(() => true), isZine: no, isNight: no, isV2: no, onPaper: no }
}

/** data-version on <html> for envelope.css, and the Envelope faces. */
export function useVersionHead() {
  useHead({ htmlAttrs: { 'data-version': 'envelope' }, link: [{ rel: 'stylesheet', href: ENVELOPE_FONTS }] })
}
