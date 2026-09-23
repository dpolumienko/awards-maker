import { ref } from 'vue'

/**
 * Pre-release switch that unlocks the paid tier for testing.
 *
 * There is no checkout yet, and the publish panel only offers "publish the free
 * version" - which strips images, clips and the Look. That makes the paid half
 * of the product impossible to walk through end to end, so this flips it on.
 *
 * Turn on with `/create?pro=1`, off with `?pro=0`. It lives in this browser only.
 * **Delete this composable when payments ship** - after that the tier has to come
 * from the account, not from a query string.
 */
const KEY = 'awards-maker:pro'

/**
 * Default ON while there is no checkout. Nothing is being given away - the tier
 * does not exist yet - and leaving it off made the paid half of the product
 * impossible to try. Turning it off is how you look at the free-plan behaviour.
 */
const pro = ref(true)
let hydrated = false

export function usePro() {
  if (import.meta.client && !hydrated) {
    hydrated = true
    try {
      const saved = localStorage.getItem(KEY)
      if (saved !== null) pro.value = saved === '1'
    } catch {
      /* private window: stays on */
    }
  }

  function setPro(on: boolean) {
    pro.value = on
    try {
      localStorage.setItem(KEY, on ? '1' : '0')
    } catch {
      /* nothing to persist to */
    }
  }

  /** Reads `?pro=1` / `?pro=0` once, on a page that cares. */
  function readProQuery(value: unknown) {
    if (value === undefined) return
    setPro(String(value) !== '0')
  }

  return { pro, setPro, readProQuery }
}
