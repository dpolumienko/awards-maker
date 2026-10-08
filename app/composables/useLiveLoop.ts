import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'
import { prefersReducedMotion } from './useReveal'

/**
 * A ticking scene on the landing (review 2026-10-06: "more animation inside the
 * blocks, less text"). `tick` runs every `ms` while the block is on screen, and
 * never with reduced motion - the scene then shows its resting state, so it has
 * to read fine without a single tick. Off screen it stops, so a long page does
 * not keep a dozen timers busy. `threshold` is how much of the block must be on
 * screen before it plays.
 */
export function useLiveLoop(el: Ref<HTMLElement | null>, ms: number, tick: () => void, threshold = 0.2) {
  const running = ref(false)
  let timer = 0
  let io: IntersectionObserver | null = null

  function set(on: boolean) {
    if (on === running.value) return
    running.value = on
    clearInterval(timer)
    if (on) timer = window.setInterval(tick, ms)
  }

  onMounted(() => {
    if (prefersReducedMotion() || !el.value) return
    io = new IntersectionObserver(([e]) => set(!!e?.isIntersecting), { threshold })
    io.observe(el.value)
  })
  onBeforeUnmount(() => {
    io?.disconnect()
    clearInterval(timer)
  })
  return { running }
}
