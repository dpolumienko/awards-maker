<script setup lang="ts">
// Port of "Interactive Accordion" from 21st.dev.
// Source: https://21st.dev/@jatin-yadav05/components/interactive-accordion
// React + Framer Motion original ported to Vue + motion-v, which is the same
// animation engine, so the spring values below are the author's, unchanged.
import { ref } from 'vue'
import { motion, AnimatePresence } from 'motion-v'
import { prefersReducedMotion } from '~/composables/useReveal'

export interface AccordionItem { q: string; a: string }
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
  <div class="w-full">
    <div v-for="(item, i) in items" :key="item.q">
      <button
        :id="`faq-q-${i}`"
        type="button"
        class="group relative w-full text-left"
        :aria-expanded="active === i"
        :aria-controls="`faq-panel-${i}`"
        @click="active = active === i ? null : i"
        @mouseenter="hovered = i"
        @mouseleave="hovered = null"
        @focus="hovered = i"
        @blur="hovered = null"
      >
        <div class="flex items-center gap-3 px-1 py-5 sm:gap-6">
          <!-- number in a circle that springs in on hover and locks on open -->
          <div class="relative flex h-10 w-10 flex-none items-center justify-center">
            <motion.span
              aria-hidden="true"
              class="absolute inset-0 rounded-pill bg-gold"
              :initial="false"
              :animate="{
                scale: active === i ? 1 : hovered === i ? 0.85 : 0,
                opacity: active === i ? 1 : hovered === i ? 0.14 : 0,
              }"
              :transition="spring"
            />
            <motion.span
              class="tnum relative z-10 text-sm font-semibold tracking-micro"
              :animate="{ color: active === i ? '#000000' : '#8A8A93' }"
              :transition="prefersReducedMotion() ? still : { duration: 0.2 }"
            >
              {{ pad(i) }}
            </motion.span>
          </div>

          <motion.h3
            class="text-lg font-semibold sm:text-xl"
            :animate="{
              x: active === i || hovered === i ? 4 : 0,
              color: active === i || hovered === i ? '#FFFFFF' : '#A5A5AC',
            }"
            :transition="springSlow"
          >
            {{ item.q }}
          </motion.h3>

          <!-- plus rotating into a cross -->
          <motion.div
            class="ml-auto flex h-8 w-8 flex-none items-center justify-center"
            :animate="{ rotate: active === i ? 45 : 0 }"
            :transition="prefersReducedMotion() ? still : { type: 'spring', stiffness: 300, damping: 20 }"
          >
            <motion.svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              class="text-gold"
              :animate="{ opacity: active === i || hovered === i ? 1 : 0.4 }"
              :transition="prefersReducedMotion() ? still : { duration: 0.2 }"
            >
              <path d="M8 1V15M1 8H15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </motion.svg>
          </motion.div>
        </div>

        <span aria-hidden="true" class="absolute inset-x-0 bottom-0 h-px origin-left bg-hair" />
        <motion.span
          aria-hidden="true"
          class="absolute bottom-0 left-0 h-px origin-left bg-gold"
          style="width: 100%"
          :initial="{ scaleX: 0 }"
          :animate="{ scaleX: active === i ? 1 : hovered === i ? 0.3 : 0 }"
          :transition="springSlow"
        />
      </button>

      <AnimatePresence mode="wait">
        <motion.div
          v-if="active === i"
          :id="`faq-panel-${i}`"
          role="region"
          :aria-labelledby="`faq-q-${i}`"
          class="overflow-hidden"
          :initial="{ height: 0, opacity: 0 }"
          :animate="{
            height: 'auto',
            opacity: 1,
            transition: { height: springSlow, opacity: prefersReducedMotion() ? still : { duration: 0.2, delay: 0.1 } },
          }"
          :exit="{ height: 0, opacity: 0, transition: { height: springSlow, opacity: { duration: 0.1 } } }"
        >
          <motion.p
            class="max-w-[80ch] py-6 pl-0 pr-0 leading-relaxed text-ink-2 sm:pl-16 sm:pr-12"
            :initial="{ y: -10 }"
            :animate="{ y: 0 }"
            :exit="{ y: -10 }"
            :transition="prefersReducedMotion() ? still : { type: 'spring', stiffness: 300, damping: 25 }"
          >
            {{ item.a }}
          </motion.p>
        </motion.div>
      </AnimatePresence>
    </div>
  </div>
</template>
