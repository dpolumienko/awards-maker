<script setup lang="ts">
// The second navigation, and the only one on a page somebody opened straight from
// a streamer's chat. One flat row of nine links read as a leftover, so the links
// are grouped the way a visitor thinks: what they can make, what they can look
// at, and the paperwork.
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
    title: 'Browse',
    links: [
      { to: '/catalog', label: 'Community awards' },
      { to: '/', label: 'How it works' },
      { to: '/plans', label: 'Plans' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { to: '/privacy', label: 'Privacy' },
      { to: '/terms', label: 'Terms' },
    ],
  },
]

const year = new Date().getFullYear()
</script>

<template>
  <footer class="mt-24 border-t border-hair py-14">
    <div class="shell">
      <div class="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,minmax(0,1fr))]">
        <div class="min-w-0">
          <NuxtLink to="/" class="text-xl font-extrabold uppercase tracking-display no-underline">
            Awards<span class="text-gold">.</span>Maker
          </NuxtLink>
          <p class="mt-3 max-w-[34ch] text-sm text-ink-2">
            Your own awards show, built in ten minutes: pick the categories, nominate any channel, let
            your chat vote.
          </p>
        </div>

        <nav v-for="g in groups" :key="g.title" :aria-label="g.title" class="min-w-0">
          <p class="label">{{ g.title }}</p>
          <ul class="mt-4 list-none space-y-2.5 p-0">
            <li v-for="l in g.links" :key="l.label">
              <NuxtLink
                :to="l.to"
                class="text-sm text-ink-2 no-underline transition-colors hover:text-ink"
              >
                {{ l.label }}
              </NuxtLink>
            </li>
          </ul>
        </nav>
      </div>

      <div class="mt-12 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-hair pt-6 text-sm text-ink-muted">
        <p class="m-0">© {{ year }} STREAMS CHARTS PO</p>
        <a
          href="https://streamscharts.com"
          class="text-ink-2 underline underline-offset-4 transition-colors hover:text-ink"
        >Streams Charts</a>
        <p class="m-0 sm:ml-auto">Developed in Ukraine</p>
      </div>
    </div>
  </footer>
</template>
