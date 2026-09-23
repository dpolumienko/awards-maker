<script setup lang="ts">
// Header for a site that now has more than one page.
//
// The four public links are the same on every page - they used to be four on the
// landing and five everywhere else, so the bar shifted under the cursor as you
// moved around. What belongs to the person signed in ("Your awards", the drafts,
// the dashboards) sits behind the account chip instead, which is also where the
// real Twitch avatar and sign-out will go.
//
// The landing keeps one anchor: "How it works" scrolls, everywhere else the same
// slot is "Overview" and routes home.
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import UiButton from './ui/UiButton.vue'
import UiIcon from './ui/UiIcon.vue'
import PlatformDot from './ui/PlatformDot.vue'
import { useAwardDraft } from '~/composables/useAwardDraft'
import { useAccount } from '~/composables/useAccount'

const route = useRoute()
const stuck = ref(false)
const open = ref(false)
const toggle = ref<HTMLButtonElement | null>(null)

const onScroll = () => (stuck.value = window.scrollY > 80)
onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }))
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))

const onLanding = computed(() => route.path === '/')
// Same four labels everywhere. Renaming the first one per page made the bar look
// like it was rearranging itself; only where it points changes.
const links = computed(() => [
  { to: onLanding.value ? '#how' : '/#how', label: 'How it works' },
  { to: '/ideas', label: 'Ideas' },
  { to: '/catalog', label: 'Catalog' },
  { to: '/plans', label: 'Plans' },
])

// What the account chip holds: everything that only exists once you have a show
// of your own. The count is real, so the chip says whether there is anything in
// there before it is opened.
const { published } = useAwardDraft()
const { signedIn, channel, signIn, signOut } = useAccount()
const mine = computed(() => published.value.length)
const menuOpen = ref(false)
const accountBtn = ref<HTMLButtonElement | null>(null)
const host = computed(() => channel.value.name)
const initials = computed(() => host.value.slice(0, 2).toUpperCase())

// The menu never survives a navigation, and Esc puts the focus back where it was.
watch(() => route.fullPath, () => {
  open.value = false
  menuOpen.value = false
})
function onKey(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  if (menuOpen.value) {
    menuOpen.value = false
    accountBtn.value?.focus()
  } else if (open.value) {
    open.value = false
    toggle.value?.focus()
  }
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <header
    :class="[
      'sticky top-0 z-40 border-b transition-[background-color,border-color] duration-300',
      stuck || open ? 'border-hair bg-canvas/90 backdrop-blur' : 'border-transparent bg-transparent',
    ]"
  >
    <div class="shell flex min-h-[72px] flex-wrap items-center gap-x-4 gap-y-2 py-4 lg:gap-8">
      <NuxtLink to="/" class="text-[clamp(1rem,4.5vw,1.25rem)] font-extrabold uppercase tracking-display no-underline">
        Awards<span class="text-gold">.</span>Maker
      </NuxtLink>

      <nav class="ml-auto hidden gap-7 lg:flex" aria-label="Main">
        <NuxtLink
          v-for="l in links"
          :key="l.to"
          :to="l.to"
          class="group relative py-2 text-xs font-semibold uppercase tracking-label text-ink-2 no-underline transition-colors hover:text-ink"
        >
          {{ l.label }}
          <span
            aria-hidden="true"
            class="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-gold transition-transform duration-300 ease-gala group-hover:scale-x-100"
          />
        </NuxtLink>
      </nav>

      <!-- the account: one chip instead of a link that appears and disappears -->
      <ClientOnly>
        <div class="relative ml-auto hidden lg:ml-6 lg:block">
          <button
            v-if="signedIn"
            ref="accountBtn"
            type="button"
            class="flex items-center gap-2 rounded-pill border border-hair py-1.5 pl-1.5 pr-3 text-sm text-ink-2 transition-colors hover:border-hair2 hover:text-ink"
            :aria-expanded="menuOpen"
            aria-controls="account-menu"
            @click="menuOpen = !menuOpen"
          >
            <span
              aria-hidden="true"
              class="grid h-7 w-7 flex-none place-items-center rounded-pill bg-s3 text-[11px] font-bold text-ink"
            >{{ initials }}</span>
            <span class="tnum">{{ mine || '' }}</span>
            <UiIcon name="chevron-right" :size="12" class="rotate-90" />
            <span class="sr-only">Your account, {{ host }}</span>
          </button>

          <!-- signed out: the one thing there is to do -->
          <button
            v-else
            type="button"
            class="flex h-9 items-center gap-2 rounded-btn bg-twitch px-4 text-sm font-bold uppercase tracking-button text-white transition-opacity hover:opacity-90"
            @click="signIn"
          >
            Sign in with Twitch
          </button>

          <div
            v-show="menuOpen && signedIn"
            id="account-menu"
            class="absolute right-0 top-full z-50 mt-2 w-60 rounded-card border border-hair bg-s1 p-2 shadow-modal"
          >
            <p class="flex items-center gap-2 px-3 py-2 text-xs text-ink-muted">
              Signed in as <span class="text-ink-2">{{ host }}</span>
              <PlatformDot :platform="channel.platform" :label="false" />
            </p>
            <NuxtLink
              to="/my-awards"
              class="flex items-center justify-between gap-2 rounded-btn px-3 py-2 text-sm text-ink-2 no-underline transition-colors hover:bg-s2 hover:text-ink"
            >
              Your awards
              <span class="tnum text-xs text-ink-muted">{{ mine }}</span>
            </NuxtLink>
            <NuxtLink
              to="/create"
              class="block rounded-btn px-3 py-2 text-sm text-ink-2 no-underline transition-colors hover:bg-s2 hover:text-ink"
            >Create your awards</NuxtLink>
            <NuxtLink
              to="/catalog"
              class="block rounded-btn px-3 py-2 text-sm text-ink-2 no-underline transition-colors hover:bg-s2 hover:text-ink"
            >Browse the catalog</NuxtLink>
            <button
              type="button"
              class="mt-1 block w-full rounded-btn border-t border-hair px-3 py-2 text-left text-sm text-ink-muted transition-colors hover:bg-s2 hover:text-ink"
              @click="signOut(); menuOpen = false"
            >
              Sign out
            </button>
          </div>
        </div>

        <template #fallback>
          <span class="ml-auto hidden h-9 w-24 lg:ml-6 lg:block" />
        </template>
      </ClientOnly>

      <UiButton to="/create" size="sm" class="hidden lg:inline-flex">Create your awards</UiButton>

      <!-- mobile: one button, three lines, no library -->
      <button
        ref="toggle"
        type="button"
        class="ml-auto grid h-11 w-11 place-items-center rounded-btn border border-hair lg:hidden"
        :aria-expanded="open"
        aria-controls="mobile-nav"
        :aria-label="open ? 'Close menu' : 'Open menu'"
        @click="open = !open"
      >
        <span aria-hidden="true" class="relative block h-4 w-5">
          <span
            class="absolute left-0 block h-0.5 w-5 bg-ink transition-transform duration-300 ease-gala"
            :class="open ? 'top-1.5 rotate-45' : 'top-0'"
          />
          <span
            class="absolute left-0 top-1.5 block h-0.5 w-5 bg-ink transition-opacity duration-200"
            :class="open && 'opacity-0'"
          />
          <span
            class="absolute left-0 block h-0.5 w-5 bg-ink transition-transform duration-300 ease-gala"
            :class="open ? 'top-1.5 -rotate-45' : 'top-3'"
          />
        </span>
      </button>
    </div>

    <nav
      v-show="open"
      id="mobile-nav"
      aria-label="Mobile"
      class="border-t border-hair bg-canvas px-4 pb-6 pt-2 sm:px-8 lg:hidden"
    >
      <NuxtLink
        v-for="l in links"
        :key="l.to"
        :to="l.to"
        class="block border-b border-hair py-4 text-sm font-bold uppercase tracking-button text-ink-2 no-underline transition-colors hover:text-ink"
      >
        {{ l.label }}
      </NuxtLink>
      <ClientOnly>
        <template v-if="signedIn">
          <NuxtLink
            to="/my-awards"
            class="flex items-center justify-between border-b border-hair py-4 text-sm font-bold uppercase tracking-button text-ink-2 no-underline transition-colors hover:text-ink"
          >
            Your awards
            <span class="tnum text-xs text-ink-muted">{{ mine }}</span>
          </NuxtLink>
          <button
            type="button"
            class="block w-full border-b border-hair py-4 text-left text-sm font-bold uppercase tracking-button text-ink-muted transition-colors hover:text-ink"
            @click="signOut"
          >
            Sign out, {{ host }}
          </button>
        </template>
        <button
          v-else
          type="button"
          class="mt-4 flex h-11 w-full items-center justify-center rounded-btn bg-twitch text-sm font-bold uppercase tracking-button text-white"
          @click="signIn"
        >
          Sign in with Twitch
        </button>
      </ClientOnly>
      <UiButton to="/create" size="sm" class="mt-5 w-full">Create your awards</UiButton>
    </nav>
  </header>
</template>
