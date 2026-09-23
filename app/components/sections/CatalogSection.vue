<script setup lang="ts">
// The showcase row on the landing. It used to hold six invented shows with
// invented voter counts, and every card linked to "#" - proof that proved
// nothing and went nowhere. The catalog page already refuses to seed fake
// awards; this section now follows the same rule and shows the real ones.
//
// The list lives in localStorage until there is an API, so the row is client-only
// and the server renders the honest fallback: what lands here and how to be first.
import { computed } from 'vue'
import SectionShell from './SectionShell.vue'
import UiButton from '../ui/UiButton.vue'
import CatalogCard from '../ui/CatalogCard.vue'
import SnapCarousel from '../ui/SnapCarousel.vue'
import { useAwardDraft } from '~/composables/useAwardDraft'
import { useVoting } from '~/composables/useVoting'

const { published } = useAwardDraft()
const { phaseOf, votersFor } = useVoting()

// Newest first: a landing row is a window, not an archive.
const rows = computed(() =>
  [...published.value]
    .reverse()
    .slice(0, 9)
    .map((award) => ({ award, phase: phaseOf(award), voters: votersFor(award.slug) })),
)
</script>

<template>
  <!-- Nothing published yet means no section at all: a heading over an empty
       frame is a hole in the page, and inventing shows to fill it is what the
       catalog already refuses to do. -->
  <ClientOnly>
    <SectionShell
      v-if="rows.length"
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
  </ClientOnly>
</template>
