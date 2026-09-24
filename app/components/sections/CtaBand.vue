<script setup lang="ts">
import { ref } from 'vue'
import UiButton from '../ui/UiButton.vue'
import GlowText from '../ui/GlowText.vue'
import SparkleField from '../ui/SparkleField.vue'
import StageLights from '../ui/StageLights.vue'
import { useReveal } from '~/composables/useReveal'

const root = ref<HTMLElement | null>(null)
useReveal(root)
</script>

<template>
  <section ref="root" class="py-8 sm:py-12">
    <div class="shell">
      <!-- same stage treatment as the hero: beams, sparkles, a lit line -->
      <div class="js-reveal relative overflow-hidden rounded-card border border-hair bg-s1 px-6 py-14 text-center sm:px-12 sm:py-20">
        <StageLights />
        <span aria-hidden="true" class="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgb(var(--gold)),transparent)]" />
        <SparkleField class="pointer-events-none absolute inset-x-0 bottom-0 h-32 opacity-70" :density="90" />

        <div class="relative">
          <h2 class="mt-4 text-[clamp(30px,5vw,64px)] font-extrabold uppercase leading-[0.98] tracking-display">
            Your chat already has
            <span class="block text-gold"><GlowText text="favorites" /></span>
          </h2>
          <p class="mx-auto mt-6 max-w-[46ch] text-lg text-ink-2">Give them a ballot. Setup takes a few minutes, and the free plan covers a first season.</p>
          <div class="mt-8 flex justify-center">
            <UiButton to="/create">Create your awards</UiButton>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
