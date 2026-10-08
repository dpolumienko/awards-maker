import type { useGsap } from '~/composables/useReveal'
import type { RevealStyle } from '~/composables/useCeremony'

type Gsap = ReturnType<typeof useGsap>['gsap']
type Target = string | Element

/**
 * How a winner arrives, one timeline per style - shared by the ceremony stage
 * and the setup's preview, so the preview is the real thing (review 2026-10-08:
 * "more ways for the winner to arrive").
 *
 * `line` is the name; `plate` the picture or initials, when there is one; `rest`
 * the runners-up that the spotlight dims; `stage` what the stamp shakes; `reel`
 * the strip of names the slot machine rolls (the last one is the winner);
 * `letters` the preview's single letters, for the styles that move them apart.
 */
export function playRevealMotion(
  gsap: Gsap,
  style: RevealStyle,
  t: { line: Target; plate?: Target | null; rest?: Target | null; stage?: Element | null; reel?: Element | null; letters?: Target | null },
) {
  const { line, plate, rest, stage, reel, letters } = t
  const both = [plate, line].filter(Boolean) as Target[]

  switch (style) {
    case 'spotlight':
      // the room drops away and one light finds the name
      if (rest) gsap.fromTo(rest, { opacity: 0.9 }, { opacity: 0.3, duration: 0.7, ease: 'power2.out' })
      if (plate) gsap.fromTo(plate, { scale: 0.92, filter: 'brightness(0.4)' }, { scale: 1, filter: 'brightness(1)', duration: 0.9, ease: 'expo.out' })
      gsap.fromTo(line, { opacity: 0, filter: 'blur(10px)' }, { opacity: 1, filter: 'blur(0px)', duration: 0.8, delay: 0.1, ease: 'expo.out' })
      return
    case 'flip':
      gsap.fromTo(both, { rotateX: -90, opacity: 0 }, { rotateX: 0, opacity: 1, duration: 0.75, ease: 'back.out(1.5)', transformPerspective: 800, stagger: 0.18 })
      return
    case 'slot':
      // names roll past and stop on the winner
      if (reel) {
        const n = reel.children.length
        gsap.fromTo(reel, { yPercent: 0 }, { yPercent: (-100 * (n - 1)) / n, duration: 1.8, ease: 'power3.inOut' })
      } else if (letters) {
        gsap.fromTo(letters, { yPercent: -320 }, { yPercent: 0, duration: 1.2, ease: 'power3.out', stagger: { each: 0.06, from: 'random' } })
      }
      if (plate) gsap.fromTo(plate, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.6, delay: reel ? 1.7 : 0.6, ease: 'expo.out' })
      return
    case 'stamp':
      // slammed down, and the stage takes the knock
      gsap.fromTo(both, { scale: 2.6, rotate: -10, opacity: 0 }, { scale: 1, rotate: 0, opacity: 1, duration: 0.38, ease: 'power4.in', stagger: 0.14 })
      if (stage) gsap.fromTo(stage, { x: -12 }, { x: 0, duration: 0.7, delay: 0.38 + (plate ? 0.14 : 0), ease: 'elastic.out(1, 0.25)' })
      return
    case 'typewriter':
      gsap.fromTo(line, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 1.4, ease: 'steps(14)' })
      if (plate) gsap.fromTo(plate, { opacity: 0 }, { opacity: 1, duration: 0.5, delay: 1.3 })
      return
    case 'curtain':
      gsap.fromTo(both, { clipPath: 'inset(0 50% 0 50%)' }, { clipPath: 'inset(0 0% 0 0%)', duration: 1.1, ease: 'expo.inOut', stagger: 0.15 })
      return
    default:
      // cut: the name climbs in
      if (plate) gsap.fromTo(plate, { scale: 0.88, opacity: 0.2 }, { scale: 1, opacity: 1, duration: 0.7, ease: 'expo.out' })
      if (letters) gsap.fromTo(letters, { yPercent: 115 }, { yPercent: 0, duration: 0.8, ease: 'expo.out', stagger: { each: 0.03, from: 'center' } })
      else gsap.fromTo(line, { yPercent: 120, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.8, delay: 0.1, ease: 'expo.out' })
  }
}
