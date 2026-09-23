import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

let registered = false

export function useGsap() {
  if (!registered && import.meta.client) {
    gsap.registerPlugin(ScrollTrigger)
    registered = true
  }
  return { gsap, ScrollTrigger }
}

export function prefersReducedMotion() {
  return import.meta.client && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Reveals every `.js-reveal` inside `root` as it scrolls into view, in document order.
 * One ScrollTrigger per batch, not per element.
 */
export function useReveal(root: Ref<HTMLElement | null>, options: { stagger?: number } = {}) {
  onMounted(() => {
    if (!root.value) return
    const targets = root.value.querySelectorAll<HTMLElement>('.js-reveal')
    if (!targets.length) return

    if (prefersReducedMotion()) {
      gsap.set(targets, { opacity: 1, y: 0 })
      return
    }

    const { gsap: g, ScrollTrigger: st } = useGsap()
    const ctx = g.context(() => {
      g.to(targets, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: 'expo.out',
        stagger: options.stagger ?? 0.09,
        scrollTrigger: { trigger: root.value!, start: 'top 82%', once: true },
      })
    }, root.value)

    onBeforeUnmount(() => {
      ctx.revert()
      st.getAll().forEach((t) => t.trigger === root.value && t.kill())
    })
  })
}
