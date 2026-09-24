<script setup lang="ts">
// Two levels, the way streamscharts.com/api does it (review 2026-09-24, item 8):
//
//   1. This product - what you can make here and where to read about it.
//   2. Streams Charts - the company line, the not-affiliated statement and SC's
//      own legal pages. Awards Maker has no terms or privacy policy of its own;
//      it is part of SC and runs under SC's.
import ScBrand from './ScBrand.vue'
import { SC } from '~/data/sc'

const groups = [
  {
    title: 'Run a show',
    links: [
      { to: '/create', label: 'Create your awards' },
      { to: '/ideas', label: 'Category ideas' },
      { to: '/my-awards', label: 'Your awards' },
    ],
  },
  {
    title: 'Learn',
    links: [
      { to: '/#how', label: 'How it works' },
      { to: '/catalog', label: 'Community awards' },
      { to: '/plans', label: 'Plans' },
    ],
  },
  {
    title: 'Streams Charts',
    links: [
      { to: SC.home, label: 'Streams Charts' },
      { to: SC.api, label: 'API' },
      { to: SC.contact, label: 'Contact' },
    ],
  },
]

const legal = [
  { to: SC.terms, label: 'Terms of Use' },
  { to: SC.privacy, label: 'Privacy Policy' },
  { to: SC.cookies, label: 'Cookie Policy' },
]

const year = new Date().getFullYear()
</script>

<template>
  <footer class="mt-24 border-t border-hair pb-10 pt-14">
    <div class="shell">
      <!-- 1. the product -->
      <div class="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,minmax(0,1fr))]">
        <div class="min-w-0">
          <ScBrand />
          <p class="mt-4 max-w-[34ch] text-sm text-ink-2">
            Your own awards show: pick the categories, nominate any channel, let your viewers vote.
          </p>
        </div>

        <nav v-for="g in groups" :key="g.title" :aria-label="g.title" class="min-w-0">
          <p class="label">{{ g.title }}</p>
          <ul class="mt-4 list-none space-y-2.5 p-0">
            <li v-for="l in g.links" :key="l.label">
              <NuxtLink
                :to="l.to"
                :external="l.to.startsWith('http')"
                class="text-sm text-ink-2 no-underline transition-colors hover:text-ink"
              >
                {{ l.label }}
              </NuxtLink>
            </li>
          </ul>
        </nav>
      </div>

      <!-- 2. the company, as on streamscharts.com -->
      <div class="mt-12 border-t border-hair pt-6">
        <p class="m-0 max-w-[80ch] text-xs leading-relaxed text-ink-muted">
          Streams Charts is not affiliated with, endorsed by, or sponsored by any platform it covers, or by the
          streamers nominated on this site. Twitch, Kick and YouTube are trademarks of their respective owners.
          Every awards is created and run by its host; Streams Charts hosts the page and counts the votes.
        </p>

        <div class="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-ink-muted">
          <p class="m-0">© {{ year }}, STREAMS CHARTS PO. All rights reserved.</p>
          <nav aria-label="Legal" class="flex flex-wrap gap-x-5 gap-y-2 sm:ml-auto">
            <a
              v-for="l in legal"
              :key="l.label"
              :href="l.to"
              class="text-ink-2 no-underline transition-colors hover:text-ink"
            >{{ l.label }}</a>
          </nav>
          <p class="m-0 flex items-center gap-2 font-semibold text-ink-2">
            <svg aria-hidden="true" width="20" height="14" viewBox="0 0 24 16" class="rounded-[2px]">
              <rect width="24" height="8" fill="#005BBB" />
              <rect width="24" height="8" y="8" fill="#FFD500" />
            </svg>
            Developed in Ukraine
          </p>
        </div>
      </div>
    </div>
  </footer>
</template>
