<script setup lang="ts">
// Header for a site that now has more than one page. On the landing the links
// are the page's own sections; everywhere else they are real routes, because
// "#how" from /create scrolled nowhere and looked broken.
// Below lg the links used to be hidden with nothing in their place - that was
// the one piece of navigation debt left from the landing build.
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import UiButton from './ui/UiButton.vue'

const route = useRoute()
const stuck = ref(false)
const open = ref(false)
const toggle = ref<HTMLButtonElement | null>(null)

const onScroll = () => (stuck.value = window.scrollY > 80)
onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }))
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))

const onLanding = computed(() => route.path === '/')
const links = computed(() =>
  onLanding.value
    ? [
        { to: '#how', label: 'How it works' },
        { to: '/ideas', label: 'Ideas' },
        { to: '/catalog', label: 'Catalog' },
        { to: '/plans', label: 'Plans' },
      ]
    : [
        { to: '/', label: 'Overview' },
        { to: '/ideas', label: 'Ideas' },
        { to: '/catalog', label: 'Catalog' },
        { to: '/plans', label: 'Plans' },
        { to: '/my-awards', label: 'Your awards' },
      ],
)

// The menu never survives a navigation, and Esc puts the focus back where it was.
watch(() => route.fullPath, () => (open.value = false))
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && open.value) {
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

      <UiButton to="/create" size="sm" class="ml-auto hidden lg:ml-6 lg:inline-flex">Create your awards</UiButton>

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
      <UiButton to="/create" size="sm" class="mt-5 w-full">Create your awards</UiButton>
    </nav>
  </header>
</template>
