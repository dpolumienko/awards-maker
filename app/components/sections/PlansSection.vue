<script setup lang="ts">
// The pricing block on the landing. Cards and copy live in one place for both
// this and /plans - components/ui/PlanCards.vue and data/plans.ts.
import SectionShell from './SectionShell.vue'
import UiButton from '../ui/UiButton.vue'
import PlanCards from '../ui/PlanCards.vue'
</script>

<template>
  <SectionShell
    id="plans"
    heading="Free, paid, or we run it for you"
    intro="Start free. Pay once if the show needs more."
  >
    <PlanCards class="mt-6" />
    <div class="js-reveal mt-8">
      <UiButton to="/plans" variant="ghost" size="sm">Compare the plans</UiButton>
    </div>
  </SectionShell>
</template>
