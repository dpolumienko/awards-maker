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
import { useAwardDraft } from '~/composables/useAwardDraft'

const route = useRoute()
const stuck = ref(false)
const open = ref(false)
const toggle = ref<HTMLButtonElement | null>(null)

const onScroll = () => (stuck.value = window.scrollY > 80)
onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }))
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))

const onLanding = computed(() => route.path === '/')
const links = computed(() => [
  onLanding.value ? { to: '#how', label: 'How it works' } : { to: '/', label: 'Overview' },
  { to: '/ideas', label: 'Ideas' },
  { to: '/catalog', label: 'Catalog' },
  { to: '/plans', label: 'Plans' },
])

// What the account chip holds: everything that only exists once you have a show
// of your own. The count is real, so the chip says whether there is anything in
// there before it is opened.
const { published, draft } = useAwardDraft()
const mine = computed(() => published.value.length)
const account = ref(false)
const accountBtn = ref<HTMLButtonElement | null>(null)
const host = computed(() => draft.value.host.name || 'you')
const initials = computed(() => host.value.slice(0, 2).toUpperCase())

// The menu never survives a navigation, and Esc puts the focus back where it was.
watch(() => route.fullPath, () => {
  open.value = false
  account.value = false
})
function onKey(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  if (account.value) {
    account.value = false
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
      <div class="relative ml-auto hidden lg:ml-6 lg:block">
        <button
          ref="accountBtn"
          type="button"
          class="flex items-center gap-2 rounded-pill border border-hair py-1.5 pl-1.5 pr-3 text-sm text-ink-2 transition-colors hover:border-hair2 hover:text-ink"
          :aria-expanded="account"
          aria-controls="account-menu"
          @click="account = !account"
        >
          <span
            aria-hidden="true"
            class="grid h-7 w-7 flex-none place-items-center rounded-pill bg-s3 text-[11px] font-bold text-ink"
          >{{ initials }}</span>
          <ClientOnly>
            <span class="tnum">{{ mine || '' }}</span>
          </ClientOnly>
          <UiIcon name="chevron-right" :size="12" class="rotate-90" />
          <span class="sr-only">Your account</span>
        </button>

        <div
          v-show="account"
          id="account-menu"
          class="absolute right-0 top-full z-50 mt-2 w-56 rounded-card border border-hair bg-s1 p-2 shadow-modal"
        >
          <p class="px-3 py-2 text-xs text-ink-muted">
            Signed in as <ClientOnly><span class="text-ink-2">{{ host }}</span></ClientOnly>
          </p>
          <NuxtLink
            to="/my-awards"
            class="flex items-center justify-between gap-2 rounded-btn px-3 py-2 text-sm text-ink-2 no-underline transition-colors hover:bg-s2 hover:text-ink"
          >
            Your awards
            <ClientOnly>
              <span class="tnum text-xs text-ink-muted">{{ mine }}</span>
            </ClientOnly>
          </NuxtLink>
          <NuxtLink
            to="/create"
            class="block rounded-btn px-3 py-2 text-sm text-ink-2 no-underline transition-colors hover:bg-s2 hover:text-ink"
          >Create your awards</NuxtLink>
          <NuxtLink
            to="/catalog"
            class="block rounded-btn px-3 py-2 text-sm text-ink-2 no-underline transition-colors hover:bg-s2 hover:text-ink"
          >Browse the catalog</NuxtLink>
        </div>
      </div>

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
      <NuxtLink
        to="/my-awards"
        class="flex items-center justify-between border-b border-hair py-4 text-sm font-bold uppercase tracking-button text-ink-2 no-underline transition-colors hover:text-ink"
      >
        Your awards
        <ClientOnly>
          <span class="tnum text-xs text-ink-muted">{{ mine }}</span>
        </ClientOnly>
      </NuxtLink>
      <UiButton to="/create" size="sm" class="mt-5 w-full">Create your awards</UiButton>
    </nav>
  </header>
</template>
