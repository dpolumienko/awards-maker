<script setup lang="ts">
import SectionShell from './SectionShell.vue'
import InfiniteMovingCards from '../ui/InfiniteMovingCards.vue'
import UiButton from '../ui/UiButton.vue'
import { IDEA_GROUPS, IDEA_TOTAL, ideaEmoji } from '~/data/ideas'

// Crawlable ideas in the DOM - this section is the page's traffic play for
// "end of year awards" / "award categories" - but drifting instead of stacked in
// three dead lists. Hovering a row stops it so a name can be read.
// Three rows here, the whole list on /ideas; both read data/ideas.ts.
const rows = IDEA_GROUPS.slice(0, 3).map((g, i) => ({
  ...g,
  dir: (i % 2 === 0 ? 'left' : 'right') as 'left' | 'right',
  items: g.items.slice(0, 10),
}))
</script>

<template>
  <SectionShell
    id="ideas"
    heading="End of year awards category ideas"
    :intro="`Stuck? Here are 30 of them, in three groups. Hover a row to stop it - all ${IDEA_TOTAL} are one page away.`"
  >
    <div class="mt-6 space-y-8">
      <div v-for="row in rows" :key="row.title" class="js-reveal">
        <div class="mb-4 flex items-center gap-3">
          <span aria-hidden="true" class="grid h-9 w-9 flex-none place-items-center rounded-btn border border-hair bg-s1 text-lg leading-none">
            {{ row.emoji }}
          </span>
          <h3 class="text-xs font-semibold uppercase tracking-label text-gold-text">{{ row.title }}</h3>
        </div>
        <InfiniteMovingCards :items="row.items" :direction="row.dir" speed="slow" :gap="12">
          <template #default="{ item }">
            <span
              class="flex items-center gap-2 rounded-pill border border-hair bg-s1 px-5 py-2.5 text-[15px] text-ink-2 transition-[color,border-color,transform] duration-300 ease-gala hover:border-gold hover:text-ink motion-safe:hover:-translate-y-0.5"
            >
              <span aria-hidden="true">{{ ideaEmoji(String(item), row) }}</span>{{ item }}
            </span>
          </template>
        </InfiniteMovingCards>
      </div>
    </div>
    <div class="js-reveal mt-8">
      <UiButton to="/ideas" variant="ghost" size="sm">All {{ IDEA_TOTAL }} category ideas</UiButton>
    </div>
  </SectionShell>
</template>
