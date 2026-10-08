import { computed } from 'vue'
import { VERSION_COOKIE, isVersion, type Version } from '~/data/design'

const ZINE_FONTS =
  'https://fonts.googleapis.com/css2?family=Anybody:wdth,wght@50..150,400..900&family=Schibsted+Grotesk:wght@400;500;600;700;800&display=swap'

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
    isZine: computed(() => version.value !== 'stage'),
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
  const { version, isZine, isNight, setVersion } = useVersion()
  const asked = useRoute().query.version
  if (isVersion(asked) && asked !== version.value) setVersion(asked)
  useHead({
    htmlAttrs: { 'data-version': () => (isZine.value ? 'zine' : 'stage'), 'data-ink': () => (isNight.value ? 'night' : undefined) },
    link: computed(() => (isZine.value ? [{ rel: 'stylesheet', href: ZINE_FONTS }] : [])),
  })
}
