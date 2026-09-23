import { computed, ref } from 'vue'
import type { Platform } from '~/types/award'

/**
 * Who is signed in.
 *
 * Until now there was no such thing: the header read the host name out of the
 * draft, so an old draft kept showing an old name and there was nothing to sign
 * out of. The account is its own state now - the draft takes its host from here,
 * not the other way round.
 *
 * The real flow is Twitch OAuth with the voter scope; this stands in for it and
 * returns the demo channel. When the API lands, `signIn` becomes the redirect and
 * `channel` comes back from the token.
 */
export interface Account {
  name: string
  platform: Platform
}

const KEY = 'awards-maker:account'
const DEMO: Account = { name: 'ishowspeed', platform: 'youtube' }

const account = ref<Account | null>(null)
let hydrated = false

export function useAccount() {
  if (import.meta.client && !hydrated) {
    hydrated = true
    try {
      const raw = localStorage.getItem(KEY)
      // Signed in by default: a prototype nobody can sign into shows nothing.
      account.value = raw ? (JSON.parse(raw) as Account) : DEMO
      if (!raw) localStorage.setItem(KEY, JSON.stringify(DEMO))
    } catch {
      account.value = DEMO
    }
  }

  const signedIn = computed(() => !!account.value)
  const channel = computed<Account>(() => account.value ?? DEMO)

  function signIn() {
    account.value = DEMO
    try {
      localStorage.setItem(KEY, JSON.stringify(DEMO))
    } catch {
      /* private window - the session lasts this tab */
    }
  }

  function signOut() {
    account.value = null
    try {
      localStorage.setItem(KEY, 'null')
    } catch {
      /* nothing to persist to */
    }
  }

  return { account, signedIn, channel, signIn, signOut }
}
