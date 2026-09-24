import { computed, toValue, type MaybeRefOrGetter } from 'vue'

// The three paid headline faces, loaded only where they are drawn.
//
// They used to be in the site-wide stylesheet link, so every page - the landing
// included - paid for four families to use one (SEO audit, 2026-09-24: the
// render-blocking fonts request was ~780 ms of mobile FCP). Archivo stays global
// in nuxt.config.ts; these come in per page.
const FAMILIES: Record<string, string> = {
  Anton: 'Anton',
  'Playfair Display': 'Playfair+Display:wght@700;800',
  'Space Grotesk': 'Space+Grotesk:wght@500;700',
}

export const DISPLAY_FONTS = Object.keys(FAMILIES)

/** Adds one stylesheet link for the given faces; Archivo and unknown names are ignored. */
export function useDisplayFonts(fonts: MaybeRefOrGetter<(string | undefined | null)[]>) {
  const href = computed(() => {
    const wanted = [...new Set(toValue(fonts).filter((f): f is string => !!f && f in FAMILIES))]
    return wanted.length
      ? `https://fonts.googleapis.com/css2?${wanted.map((f) => `family=${FAMILIES[f]}`).join('&')}&display=swap`
      : ''
  })
  useHead({
    link: computed(() => (href.value ? [{ rel: 'stylesheet', href: href.value, key: 'display-fonts' }] : [])),
  })
}
