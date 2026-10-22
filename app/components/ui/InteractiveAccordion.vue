<script setup lang="ts">
// Port of "Interactive Accordion" from 21st.dev.
// Source: https://21st.dev/@jatin-yadav05/components/interactive-accordion
// React + Framer Motion original ported to Vue + motion-v, which is the same
// animation engine, so the spring values below are the author's, unchanged.
import { ref } from 'vue'
import { motion } from 'motion-v'
import { prefersReducedMotion } from '~/composables/useReveal'
// Envelope: the same list the landing's FAQ is (EnvLanding), not the springy circles

export interface AccordionItem { q: string; a: string; link?: { href: string; text: string } }
const { items } = defineProps<{ items: AccordionItem[] }>()

const active = ref<number | null>(null)
const hovered = ref<number | null>(null)

// Springs are the author's; under reduced motion they collapse to no transition,
// the way every other animated piece on this page behaves.
const still = { duration: 0 } as const
const spring = prefersReducedMotion() ? still : ({ type: 'spring', stiffness: 400, damping: 25 } as const)
const springSlow = prefersReducedMotion() ? still : ({ type: 'spring', stiffness: 300, damping: 30 } as const)
const pad = (i: number) => String(i + 1).padStart(2, '0')
</script>

<template>
  <div class="env-faq">
    <details v-for="(item, i) in items" :key="item.q">
      <summary><small>{{ pad(i) }}</small>{{ item.q }}</summary>
      <p>{{ item.a }} <a v-if="item.link" class="env-faq-link" :href="item.link.href">{{ item.link.text }}</a></p>
    </details>
  </div>
</template>
