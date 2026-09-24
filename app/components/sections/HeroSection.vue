<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import UiButton from '../ui/UiButton.vue'
import UiCounter from '../ui/UiCounter.vue'
import GlowText from '../ui/GlowText.vue'
import StageLights from '../ui/StageLights.vue'
import GlowDivider from '../ui/GlowDivider.vue'
import SparkleField from '../ui/SparkleField.vue'
import { useGsap, prefersReducedMotion } from '~/composables/useReveal'
import { FREE } from '~/types/award'
import { useCatalogOpen } from '~/composables/useAwards'
import { IDEA_TOTAL } from '~/data/ideas'
import { PLATFORM_NAMES } from '~/data/platforms'

// the platforms a channel nominee can come from, not everything SC tracks
const PLATFORMS = Object.keys(PLATFORM_NAMES).length
const catalogOpen = useCatalogOpen()

const root = ref<HTMLElement | null>(null)

onMounted(() => {
  if (!root.value) return
  const targets = root.value.querySelectorAll('.js-reveal')
  if (prefersReducedMotion()) {
    const { gsap } = useGsap()
    gsap.set([targets, root.value.querySelectorAll('.js-line > span')], { opacity: 1, y: 0 })
    gsap.set(root.value.querySelectorAll('.js-line'), { overflow: 'visible' })
    return
  }
  const { gsap } = useGsap()
  const ctx = gsap.context(() => {
    gsap
      .timeline({ defaults: { ease: 'expo.out' } })
      .to('.js-spot', { opacity: 1, duration: 2.2 }, 0)
      .to('.js-line > span', {
        y: 0,
        duration: 1,
        stagger: 0.12,
        // the mask is only needed while the line slides up; after that it would
        // clip the glow spill under the headline
        onComplete: () => gsap.set('.js-line', { overflow: 'visible' }),
      }, 0.15)
      .to(targets, { opacity: 1, y: 0, duration: 0.9, stagger: 0.1 }, 0.5)
  }, root.value)
  onBeforeUnmount(() => ctx.revert())
})
</script>

<template>
  <section ref="root" class="relative overflow-hidden pb-24 pt-20">
    <StageLights />
    <!-- dust rising through the whole stage, gone before the top edge -->
    <SparkleField class="pointer-events-none absolute inset-0 z-0" :density="130" :seed-from="0.55" />

    <!-- spotlight: the stage light this whole system is built around -->
    <span
      aria-hidden="true"
      class="js-spot pointer-events-none absolute -top-[340px] left-1/2 h-[700px] w-[1100px] -translate-x-1/2 opacity-0 blur-[10px]"
      style="background: radial-gradient(ellipse at center, rgb(var(--gold) / .16) 0%, rgb(var(--gold) / .05) 38%, transparent 70%)"
    />

    <div class="shell relative z-10">
      <h1 class="font-extrabold uppercase tracking-display">
        <span class="js-line block overflow-hidden">
          <span class="mb-3 block text-[clamp(20px,3vw,34px)] font-bold leading-[1.1] tracking-heading text-gold-text">Awards Maker for streamers:</span>
        </span>
        <span class="display-1 block">
          <span class="js-line block overflow-hidden"><span class="block">Run your own</span></span>
          <span class="js-line block overflow-hidden">
            <span class="block text-gold"><GlowText text="awards show" /></span>
          </span>
        </span>
      </h1>

      <p class="js-reveal mt-8 max-w-[60ch] text-xl text-ink-2">
        Run your own streamer awards: pick the categories, nominate channels from Twitch, Kick and YouTube or your
        community's favorite meme, and let your viewers vote for every winner.
      </p>

      <div class="js-reveal mt-8 flex flex-wrap items-center gap-4">
        <UiButton to="/create">Create your awards</UiButton>
        <UiButton v-if="catalogOpen" to="/catalog" variant="ghost">Browse the catalog</UiButton>
        <UiButton v-else to="/ideas" variant="ghost">Category ideas</UiButton>
      </div>
      <p class="js-reveal mt-3 text-sm text-ink-muted">Free. You'll log in with Twitch to create awards.</p>
    </div>

    <div class="shell relative z-10">
      <div class="js-reveal relative mt-12 h-10">
        <GlowDivider />
      </div>

      <!-- What is true on day one. Site-wide totals (shows published, votes
           counted) come back here once there are real ones worth showing. -->
      <div class="js-reveal flex flex-wrap gap-12 pt-2">
        <UiCounter :value="PLATFORMS" label="Platforms to nominate from" />
        <UiCounter :value="IDEA_TOTAL" label="Category ideas to start from" />
        <UiCounter :value="FREE.maxNominations" label="Categories free" />
      </div>

    </div>
  </section>
</template>
