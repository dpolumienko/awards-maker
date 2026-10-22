import { computed, onMounted, ref, type Ref } from 'vue'
import type { SignInProvider } from '~/composables/useAccount'
import { useVoting, type Phase } from '~/composables/useVoting'
import type { Award } from '~/types/award'

/**
 * A viewer's ballot on the public awards page, whatever the page looks like: the
 * Current list, the Fanzine's and the Envelope's stepper (review 2026-10-16)
 * all read the same state and send through the same submit.
 *
 * Each pick is final, but categories skipped the first time stay open until
 * voting closes (review 2026-10-08) - a second submit fills only those.
 */
export function useBallot(opts: {
  slug: Ref<string>
  award: Ref<Award | undefined>
  ballot: Ref<{ picks: Record<string, string> } | null | undefined>
  phase: Ref<Phase>
  refresh: () => Promise<unknown>
  /** after a ballot is counted: the page focuses and marks its confirmation */
  onCast?: () => void
}) {
  const { castBallot } = useVoting()
  const { signedIn, signIn } = useAccount()

  const picks = ref<Record<string, string>>({})
  const voted = computed(() => !!opts.ballot.value)
  const cast = computed(() => opts.ballot.value?.picks ?? {})
  const shown = computed(() => ({ ...picks.value, ...cast.value }))
  /** picks on screen not yet sent - what the submit button sends */
  const fresh = computed(() => Object.fromEntries(Object.entries(picks.value).filter(([id]) => !cast.value[id])))
  const pickedCount = computed(() => Object.keys(fresh.value).length)
  const castCount = computed(() => Object.keys(cast.value).length)
  const skipped = computed(() => (opts.award.value?.nominations.length ?? 0) - castCount.value)
  const voteError = ref('')

  const mode = computed<'vote' | 'locked' | 'results'>(() => {
    if (opts.phase.value === 'revealed') return 'results'
    if (opts.phase.value === 'open' && (!voted.value || skipped.value > 0)) return 'vote'
    return 'locked'
  })

  /**
   * The sign-in is a full-page round trip, so the picks are parked in
   * sessionStorage and put back when the voter lands on this ballot again (QA P1:
   * they used to come back to an empty ballot). They are not submitted for them -
   * one submit per account, so the voter presses it.
   */
  const PARKED = (s: string) => `am-picks:${s}`
  onMounted(() => {
    try {
      const parked = sessionStorage.getItem(PARKED(opts.slug.value))
      if (!parked) return
      sessionStorage.removeItem(PARKED(opts.slug.value))
      if (!voted.value) picks.value = JSON.parse(parked)
    } catch {
      /* nothing parked */
    }
  })

  async function submit(provider?: SignInProvider) {
    if (!pickedCount.value) return
    voteError.value = ''
    if (!signedIn.value) {
      try {
        sessionStorage.setItem(PARKED(opts.slug.value), JSON.stringify(picks.value))
      } catch {
        /* private mode: the voter picks again */
      }
      signIn(provider)
      return
    }
    try {
      await castBallot(opts.slug.value, fresh.value)
      await opts.refresh()
      opts.onCast?.()
    } catch (error) {
      // 409 is "already voted" or "voting closed" - both are things to say out
      // loud rather than swallow, because the ballot on screen looks fine
      voteError.value = (error as { statusMessage?: string }).statusMessage || 'Could not save your vote'
      await opts.refresh()
    }
  }

  return { picks, voted, cast, shown, fresh, pickedCount, castCount, skipped, voteError, mode, submit, signedIn }
}
