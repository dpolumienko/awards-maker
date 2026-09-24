import { onBeforeUnmount, ref } from 'vue'

/**
 * A control that destroys something asks once: the first click arms it, the
 * second does the thing, and it disarms itself if the answer never comes.
 *
 * This was written out by hand in four places - the nomination card, the partner
 * row, the show list and the "publish the winners" button - with three different
 * labels and one of them missing the confirm step entirely. A dialog would be
 * heavier than the action deserves; two states on one button is the whole idea.
 */
export function useArm(timeoutMs = 4000) {
  /** Which target is armed - a slug, an id, or `true` when there is only one. */
  const armed = ref<string | boolean>(false)
  let timer: ReturnType<typeof setTimeout> | undefined

  function disarm() {
    clearTimeout(timer)
    armed.value = false
  }

  function isArmed(key: string | true = true) {
    return armed.value === key
  }

  /**
   * Returns true when the caller should go ahead - i.e. this was the second
   * click. The first click only arms.
   */
  function arm(key: string | true = true): boolean {
    if (armed.value === key) {
      disarm()
      return true
    }
    clearTimeout(timer)
    armed.value = key
    timer = setTimeout(disarm, timeoutMs)
    return false
  }

  onBeforeUnmount(() => clearTimeout(timer))

  return { armed, arm, isArmed, disarm }
}
