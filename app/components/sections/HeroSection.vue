<script setup lang="ts">
// The hero is above the fold, so it must paint on the first frame. It used to
// start hidden (opacity 0, lines clipped under a mask) until GSAP ran after
// hydration - 3 s of render delay on mobile LCP (SEO audit, 2026-09-24). The
// entrance is now CSS that only moves things: everything is visible from the
// first paint, and nothing waits for JavaScript.
import UiButton from '../ui/UiButton.vue'
import UiCounter from '../ui/UiCounter.vue'
import GlowText from '../ui/GlowText.vue'
import StageLights from '../ui/StageLights.vue'
import GlowDivider from '../ui/GlowDivider.vue'
import SparkleField from '../ui/SparkleField.vue'
import { FREE } from '~/types/award'
import { useCatalogOpen } from '~/composables/useAwards'
import { IDEA_TOTAL } from '~/data/ideas'
import { PLATFORM_NAMES } from '~/data/platforms'

// the platforms a channel nominee can come from, not everything SC tracks
const PLATFORMS = Object.keys(PLATFORM_NAMES).length
const catalogOpen = useCatalogOpen()

</script>

<template>
  <section class="relative overflow-hidden pb-24 pt-20">
    <StageLights />
    <!-- dust rising through the whole stage, gone before the top edge -->
    <SparkleField class="pointer-events-none absolute inset-0 z-0" :density="130" :seed-from="0.55" />

    <!-- spotlight: the stage light this whole system is built around -->
    <span
      aria-hidden="true"
      class="hero-spot pointer-events-none absolute -top-[340px] left-1/2 h-[700px] w-[1100px] -translate-x-1/2 blur-[10px]"
      style="background: radial-gradient(ellipse at center, rgb(var(--gold) / .16) 0%, rgb(var(--gold) / .05) 38%, transparent 70%)"
    />

    <div class="shell relative z-10">
      <h1 class="font-extrabold uppercase tracking-display">
        <span class="block">
          <span class="hero-rise mb-3 block text-[clamp(20px,3vw,34px)] font-bold leading-[1.1] tracking-heading text-ink-2">Awards Maker for streamers: </span>
        </span>
        <span class="display-1 block">
          <span class="hero-rise block" style="--d: 80ms">Run your own </span>
          <span class="hero-rise block text-gold" style="--d: 160ms"><GlowText text="awards show" /></span>
        </span>
      </h1>

      <p class="hero-rise mt-8 max-w-[60ch] text-lg text-ink-2 sm:text-xl" style="--d: 240ms">
        Run your own streamer awards: pick the categories, nominate channels from Twitch, Kick and YouTube or your
        community's favorite meme, and let your viewers vote for every winner.
      </p>

      <div class="hero-rise mt-8 flex flex-wrap items-center gap-4" style="--d: 320ms">
        <UiButton to="/create" class="w-full sm:w-auto">Create your awards</UiButton>
        <UiButton v-if="catalogOpen" to="/catalog" variant="ghost" class="w-full sm:w-auto">Browse the catalog</UiButton>
        <UiButton v-else to="/ideas" variant="ghost" class="w-full sm:w-auto">Category ideas</UiButton>
      </div>
      <p class="hero-rise mt-3 text-sm text-ink-muted" style="--d: 360ms">Free. You'll log in with Twitch to create awards.</p>
    </div>

    <div class="shell relative z-10">
      <div class="hero-rise relative mt-12 h-10" style="--d: 400ms">
        <GlowDivider />
      </div>

      <!-- What is true on day one. Site-wide totals (shows published, votes
           counted) come back here once there are real ones worth showing. -->
      <div class="hero-rise grid grid-cols-3 gap-4 pt-2 sm:flex sm:gap-12" style="--d: 440ms">
        <UiCounter :value="PLATFORMS" label="Platforms to nominate from" />
        <UiCounter :value="IDEA_TOTAL" label="Category ideas to start from" />
        <UiCounter :value="FREE.maxNominations" label="Categories free" />
      </div>

    </div>
  </section>
</template>
