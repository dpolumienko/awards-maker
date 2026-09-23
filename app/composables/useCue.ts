import { nextTick } from 'vue'
import { prefersReducedMotion, useGsap } from './useReveal'

/**
 * The small moments: a ballot going in, voting closing, winners going out.
 *
 * None of them deserve a dialog - the page already says what happened, in place.
 * What they get is a light cue on the panel that carries the news: a hairline
 * draws across the top edge in the show's colour, and the panel lifts once.
 *
 * Same idea as the curtain after publishing, an order of magnitude quieter.
 */
export async function playCue(el: HTMLElement | null, accent = '#D9A441') {
  if (!el || prefersReducedMotion()) return
  await nextTick()
  const { gsap } = useGsap()

  const line = document.createElement('span')
  line.setAttribute('aria-hidden', 'true')
  Object.assign(line.style, {
    position: 'absolute',
    insetInline: '0',
    top: '0',
    height: '2px',
    background: accent,
    transformOrigin: 'left',
    pointerEvents: 'none',
  })
  const position = getComputedStyle(el).position
  if (position === 'static') el.style.position = 'relative'
  el.appendChild(line)

  gsap
    .timeline({ onComplete: () => line.remove() })
    .fromTo(el, { y: 10, opacity: 0.6 }, { y: 0, opacity: 1, duration: 0.55, ease: 'expo.out' })
    .fromTo(line, { scaleX: 0 }, { scaleX: 1, duration: 0.7, ease: 'expo.out' }, 0)
    .to(line, { opacity: 0, duration: 0.5, ease: 'power2.in' }, '+=0.7')
}
