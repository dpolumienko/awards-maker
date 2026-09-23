import { useGsap, prefersReducedMotion } from '~/composables/useReveal'

// Smooth scroll, driven by GSAP's ticker so scroll-linked animations stay in sync.
// Only on the landing: the builder is a long form with a sticky preview and the
// awards page is a ballot - intercepting the wheel there buys nothing. The import
// is dynamic so the library stays out of those routes' payload entirely.
export default defineNuxtPlugin((nuxtApp) => {
  if (prefersReducedMotion()) return

  let lenis: { destroy: () => void; raf: (t: number) => void } | null = null
  let tick: ((t: number) => void) | null = null

  async function start() {
    if (lenis) return
    const { gsap, ScrollTrigger } = useGsap()
    const { default: Lenis } = await import('lenis')
    const instance = new Lenis({ duration: 1.05, smoothWheel: true })
    instance.on('scroll', ScrollTrigger.update)
    tick = (time: number) => instance.raf(time * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)
    lenis = instance
  }

  function stop() {
    if (!lenis) return
    const { gsap } = useGsap()
    if (tick) gsap.ticker.remove(tick)
    lenis.destroy()
    lenis = null
    tick = null
  }

  const apply = (path: string) => (path === '/' ? start() : stop())

  nuxtApp.hook('app:mounted', () => apply(useRoute().path))
  useRouter().afterEach((to) => apply(to.path))
})
