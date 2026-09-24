import { ref } from 'vue'
import type { AwardLook } from '~/types/award'

export interface CurtainShow {
  slug: string
  name: string
  /** Where the show now lives, shown as plain text - this is the payoff. */
  url: string
  look: AwardLook
}

const show = ref<CurtainShow | null>(null)

/**
 * The publish curtain does not belong to the builder page.
 *
 * It used to: `create.vue` mounted it and navigated on its `done` event. That
 * put the route change *after* the wipe, so for the last 0.7s the curtain was
 * uncovering the builder underneath - and `publish()` has just emptied the
 * draft, so what it uncovered was a blank form. Then the router swapped pages.
 * That double change of what is on screen is the flash.
 *
 * Mounted in `app.vue` instead, the curtain survives the route change: it starts
 * navigating as the wipe begins and finishes over the award page it just made.
 */
export function usePublishCurtain() {
  return {
    show,
    open: (next: CurtainShow) => (show.value = next),
    close: () => (show.value = null),
  }
}
