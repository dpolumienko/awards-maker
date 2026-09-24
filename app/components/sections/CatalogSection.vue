<script setup lang="ts">
// The showcase row on the landing. It used to hold six invented shows with
// invented voter counts, and every card linked to "#" - proof that proved
// nothing and went nowhere. The catalog page already refuses to seed fake
// awards; this section now follows the same rule and shows the real ones.
//
// It renders on the server now: the landing is the page that gets crawled, and a
// client-only row of real shows is a row a crawler never sees.
import { computed } from 'vue'
import SectionShell from './SectionShell.vue'
import UiButton from '../ui/UiButton.vue'
import CatalogCard from '../ui/CatalogCard.vue'
import SnapCarousel from '../ui/SnapCarousel.vue'
import { useCatalog, useCatalogOpen } from '~/composables/useAwards'
import { phaseOf } from '~/composables/useVoting'

// tolerant: this row is one section of the landing, not the landing
const { data } = await useCatalog({ tolerant: true })
const catalogOpen = useCatalogOpen()

// Newest first: a landing row is a window, not an archive.
const rows = computed(() =>
  (data.value?.awards ?? [])
    .slice(0, 9)
    .map((award) => ({ award, phase: phaseOf(award as never, award.voters), voters: award.voters })),
)
</script>

<template>
  <!-- Nothing published yet means no section at all: a heading over an empty
       frame is a hole in the page, and inventing shows to fill it is what the
       catalog already refuses to do. -->
  <SectionShell
    v-if="catalogOpen && rows.length"
    id="catalog"
    heading="Community awards running right now"
    intro="Other streamers built these for their own communities. Drag the row, or open one to see the nominees, vote where chat decides, and check the winners once they're out."
  >
    <div class="js-reveal mt-6">
      <SnapCarousel label="Community awards" :count="rows.length" :gap="20" :peek="28">
        <template #slide="{ i }">
          <CatalogCard
            :award="rows[i]!.award"
            :phase="rows[i]!.phase"
            :voters="rows[i]!.voters"
            class="h-full"
          />
        </template>
      </SnapCarousel>
    </div>

    <div class="js-reveal mt-8 flex flex-wrap gap-3">
      <UiButton to="/catalog" variant="ghost">Browse all community awards</UiButton>
      <UiButton to="/create">Create your awards</UiButton>
    </div>
  </SectionShell>
</template>
