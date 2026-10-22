import { computed, watchEffect } from 'vue'
import { VERSION_COOKIE, isVersion, type Version } from '~/data/design'

const ZINE_FONTS =
  'https://fonts.googleapis.com/css2?family=Anybody:wdth,wght@50..150,400..900&family=Schibsted+Grotesk:wght@400;500;600;700;800&display=swap'
const ENVELOPE_FONTS = 'https://fonts.googleapis.com/css2?family=Gloock&family=Hanken+Grotesk:wght@400;500;600;700&display=swap'
// the paper family: the Fanzine and both Nights share every zine template and rule
const PAPER: readonly Version[] = ['zine', 'night', 'night2']

/**
 * Which version of the site this viewer sees (data/design.ts). One shared
 * state for every component, mirrored into the cookie so the server renders
 * the same version the browser asked for.
 */
export function useVersion() {
  const cookie = useCookie<string | null>(VERSION_COOKIE, { maxAge: 60 * 60 * 24 * 365, sameSite: 'lax', path: '/' })
  const version = useState<Version>('am-version', () => (isVersion(cookie.value) ? cookie.value : 'stage'))
  function setVersion(v: Version) {
    version.value = v
    cookie.value = v
  }
  return {
    version,
    // Night is the Fanzine on black: every Fanzine template and rule applies to it too
    isZine: computed(() => PAPER.includes(version.value)),
    // the designer's prototype (Envelope): own tokens and components, none of the paper ones
    isEnvelope: computed(() => version.value === 'envelope'),
    isNight: computed(() => version.value === 'night' || version.value === 'night2'),
    // Night v2: the reworked builder (ticket steps) and dashboard (show desk)
    isV2: computed(() => version.value === 'night2'),
    // light paper: an accent's text is darkened to read on it, not lightened (utils/accent.ts)
    onPaper: computed(() => version.value === 'zine'),
    setVersion,
  }
}

/**
 * Puts the version on <html>, so CSS and templates read the same thing, and loads
 * the Fanzine's two faces only for the Fanzine. `?version=` in a link picks it and
 * keeps it. Called by app.vue and error.vue - the error page renders without the app.
 */
export function useVersionHead() {
  const { version, isZine, isNight, isEnvelope, setVersion } = useVersion()
  const asked = useRoute().query.version
  if (isVersion(asked) && asked !== version.value) setVersion(asked)
  const attr = computed(() => (isZine.value ? 'zine' : isEnvelope.value ? 'envelope' : 'stage'))
  const ink = computed(() => (isNight.value ? 'night' : undefined))
  const fonts = computed(() => (isZine.value ? ZINE_FONTS : isEnvelope.value ? ENVELOPE_FONTS : ''))
  useHead({
    htmlAttrs: { 'data-version': () => attr.value, 'data-ink': () => ink.value },
    link: computed(() => (fonts.value ? [{ rel: 'stylesheet', href: fonts.value }] : [])),
  })
  // A page that fails while the app starts (a 404 in the static demo) renders the
  // error page outside the app's head, and the head above never lands - the 404
  // came up in the Current look whatever the version. So on the client the same
  // three things go on the document directly too.
  if (import.meta.client) {
    watchEffect(() => {
      const d = document.documentElement
      d.dataset.version = attr.value
      if (ink.value) d.dataset.ink = ink.value
      else delete d.dataset.ink
      if (fonts.value && !document.querySelector(`link[href="${fonts.value}"]`)) {
        document.head.append(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: fonts.value }))
      }
    })
  }
}
