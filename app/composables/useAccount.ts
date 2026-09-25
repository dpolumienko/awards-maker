import { computed } from 'vue'
import type { Platform } from '~/types/award'

/**
 * Who is signed in - now a real Twitch session rather than a name in
 * localStorage.
 *
 * Two doors into the same provider. Voting asks for an identity and nothing
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

  // Every channel we sign in is a Twitch channel: that is the only provider the
  // login speaks. A host can still nominate channels on Kick and YouTube.
  const channel = computed<Account>(() => ({
    name: user.value?.name ?? user.value?.login ?? '',
    platform: 'twitch',
  }))

  /** Comes back here afterwards - the callback reads this cookie, not a query. */
  function rememberReturn() {
    if (!import.meta.client) return
    document.cookie = `am-return=${encodeURIComponent(useRoute().fullPath)}; path=/; max-age=600; samesite=lax`
  }

  // The static demo on GitHub Pages has no server: /auth/* is not there, and
  // sending someone to it ended on GitHub's own 404 (review 2026-09-25).
  const demo = !!useRuntimeConfig().public.demo
  function demoStop() {
    window.alert('Sign-in is off in this demo: it is a static copy of the site with no server behind it. Everything can be looked at; voting and publishing need the live site.')
  }

  function signIn() {
    if (!import.meta.client) return
    if (demo) return demoStop()
    rememberReturn()
    window.location.href = '/auth/twitch'
  }

  /** The wider consent, for someone who is about to run a show. */
  function signInAsHost() {
    if (!import.meta.client) return
    if (demo) return demoStop()
    window.location.href = '/auth/twitch-host'
  }

  async function signOut() {
    await clear()
    if (import.meta.client) window.location.href = '/auth/logout'
  }

  return { account: user, signedIn, isHost, isAdmin, channel, signIn, signInAsHost, signOut }
}
