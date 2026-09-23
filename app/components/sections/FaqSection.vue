<script setup lang="ts">
import SectionShell from './SectionShell.vue'
import InteractiveAccordion, { type AccordionItem } from '../ui/InteractiveAccordion.vue'

export type FaqItem = AccordionItem
defineProps<{ items: FaqItem[] }>()
</script>

<template>
  <SectionShell id="faq" heading="FAQ">
    <div class="js-reveal mt-6 border-t border-hair">
      <InteractiveAccordion :items="items" />
    </div>
  </SectionShell>
</template>
