import { computed } from 'vue'
import type { Platform } from '~/types/award'

/** The providers an account can sign in with; nominees can be on YouTube too. */
export type SignInProvider = 'twitch' | 'kick'

/**
 * Who is signed in - a real Twitch or Kick session rather than a name in
 * localStorage.
 *
 * Two doors into each provider. Voting asks for an identity and nothing
 * else; running a show asks for the channel's subscribers and followers, which
 * is a ten-permission consent screen and not something to put in front of
 * someone who only wants to click one radio button. `host` says which door this
 * session came through.
 */
export interface Account {
  name: string
  platform: Platform
}

export function useAccount() {
  const { loggedIn, user, clear } = useUserSession()

  const signedIn = computed(() => loggedIn.value)
  const isHost = computed(() => Boolean(user.value?.host))
  const isAdmin = computed(() => user.value?.role === 'admin')

  // The channel is the account signed in with, Twitch or Kick. A host can still
  // nominate channels on any platform, YouTube included.
  const channel = computed<Account>(() => ({
    name: user.value?.name ?? user.value?.login ?? '',
    platform: (user.value?.platform as SignInProvider | undefined) ?? 'twitch',
  }))

  /** Comes back here afterwards - the callback reads this cookie, not a query. */
  function rememberReturn() {
    if (!import.meta.client) return
    document.cookie = `am-return=${encodeURIComponent(useRoute().fullPath)}; path=/; max-age=600; samesite=lax`
  }

  // The static demo on GitHub Pages has no server: /auth/* is not there, and
  // sending someone to it ended on GitHub's own 404 (review 2026-09-25).
  const demo = !!useRuntimeConfig().public.demo
  // There, "sign in" skips the provider and signs in a demo host (app/demo/api.ts).
  async function demoStop(provider: SignInProvider) {
    const { demoSignIn } = await import('~/demo/api')
    demoSignIn(provider)
    await useUserSession().fetch()
  }

  function signIn(provider: SignInProvider = 'twitch') {
    if (!import.meta.client) return
    if (demo) return demoStop(provider)
    rememberReturn()
    window.location.href = `/auth/${provider}`
  }

  /** The wider consent, for someone who is about to run a show. */
  function signInAsHost(provider: SignInProvider = 'twitch') {
    if (!import.meta.client) return
    if (demo) return demoStop(provider)
    window.location.href = `/auth/${provider}-host`
  }

  async function signOut() {
    await clear()
    if (import.meta.client) window.location.href = '/auth/logout'
  }

  return { account: user, signedIn, isHost, isAdmin, channel, signIn, signInAsHost, signOut }
}
