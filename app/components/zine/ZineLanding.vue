<script setup lang="ts">
// The landing in the Fanzine version. Same H1, same FAQ and schema (both handed
// in by pages/index.vue), same data as the Current landing.
//
// Rebuilt 2026-10-08 on stakeholder feedback ("too much text, reads as AI,
// boring") and run through the design-taste-frontend pre-flight: every section is
// one short headline and a working scene instead of paragraphs - a category
// being voted on live, the three steps played out, four feature scenes, the ideas
// as a marquee - then prices, the closing ticket, the catalog and the questions.
// Each layout family appears once.
import { computed } from 'vue'
import UiButton from '~/components/ui/UiButton.vue'
import InteractiveAccordion from '~/components/ui/InteractiveAccordion.vue'
import ZineLive from './ZineLive.vue'
import ZineHow from './ZineHow.vue'
import ZineBento from './ZineBento.vue'
import ZineIdeas from './ZineIdeas.vue'
import ZineCta from './ZineCta.vue'
import { PLANS } from '~/data/plans'
import { useCatalog, useCatalogOpen } from '~/composables/useAwards'
import type { FaqItem } from '~/components/sections/FaqSection.vue'

defineProps<{ faq: FaqItem[] }>()

const catalogOpen = useCatalogOpen()
const { data } = await useCatalog({ tolerant: true })
const rack = computed(() => (data.value?.awards ?? []).slice(0, 3))
</script>

<template>
  <div class="zl">
    <!-- the cover: the promise on the left, the product working on the right -->
    <section class="zl-cover">
      <div class="shell zl-cover-grid">
        <div>
          <h1>
            <span class="zl-kicker">Awards Maker for streamers:</span>
            <span class="zl-h1 zine-display">Run your own awards show</span>
          </h1>
          <p class="zl-lead">
            Pick the categories, nominate channels from Twitch, Kick and YouTube, and let your viewers vote for every
            winner.
          </p>
          <div class="zl-ctas">
            <UiButton to="/create">Create your awards</UiButton>
            <UiButton v-if="catalogOpen" to="/catalog" variant="ghost">Browse the catalog</UiButton>
            <UiButton v-else to="/ideas" variant="ghost">Category ideas</UiButton>
          </div>
        </div>
        <ZineLive />
      </div>
    </section>

    <ZineHow />
    <ZineBento />
    <ZineIdeas />

    <!-- prices: the paid one is an admission ticket -->
    <section class="zl-sec">
      <div class="shell">
        <h2 class="zl-h2 zine-display">Free, paid, or we run it</h2>
        <p class="zl-intro">The paid tier is a one-off purchase per awards, not a subscription.</p>
        <div class="zl-prices">
          <div v-for="p in PLANS" :key="p.id" class="zl-prc" :class="p.featured && 'is-coupon zine-ticket'">
            <span v-if="p.featured" class="zine-ticket-tag" aria-hidden="true">Admit one</span>
            <h3>{{ p.name }}</h3>
            <p class="zl-pr"><b class="tnum">{{ p.price }}</b> {{ p.per }}</p>
            <ul><li v-for="f in p.features" :key="f">{{ f }}</li></ul>
            <UiButton :to="p.cta.to" :variant="p.cta.variant">{{ p.cta.label }}</UiButton>
          </div>
        </div>
      </div>
    </section>

    <ZineCta />

    <!-- real shows only, like the Current landing -->
    <section v-if="catalogOpen && rack.length" class="zl-sec">
      <div class="shell">
        <h2 class="zl-h2 zine-display">Community awards running now</h2>
        <div class="zl-rack">
          <NuxtLink v-for="a in rack" :key="a.slug" :to="`/a/${a.slug}`" class="zl-rk">
            <div class="zl-rk-zine"><span class="zl-dots" /><b>{{ a.name }}</b></div>
            <div><h3>{{ a.name }}</h3><p>by {{ a.host.name }} · {{ a.categories }} categories</p></div>
          </NuxtLink>
        </div>
        <p class="mt-8"><UiButton to="/catalog" variant="ghost">Browse the catalog</UiButton></p>
      </div>
    </section>

    <!-- the FAQ, the same accordion as on /create -->
    <section class="zl-sec zl-last">
      <div class="shell">
        <h2 class="zl-h2 zine-display">Questions</h2>
        <div class="mt-10 border-t border-hair">
          <InteractiveAccordion :items="faq" />
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.zl { --rule: rgb(var(--ink)); }
.zl-sec { padding: 72px 0; border-top: 2px solid var(--rule); }
.zl-last { padding-bottom: 96px; }
.zl-h2 { font-size: clamp(36px, 5vw, 60px); line-height: 0.9; text-transform: uppercase; color: rgb(var(--gold)); max-width: 14ch; text-wrap: balance; }
.zl-intro { margin-top: 16px; max-width: 58ch; font-size: 18px; line-height: 1.5; color: rgb(var(--ink-2)); }

/* cover */
.zl-cover { padding: 48px 0 80px; overflow-x: clip; }
.zl-cover-grid { display: grid; gap: 48px; align-items: center; grid-template-columns: minmax(0, 1fr); }
@media (min-width: 1200px) { .zl-cover-grid { grid-template-columns: minmax(0, 1fr) 520px; } }
.zl-kicker { display: block; margin-bottom: 14px; font-size: clamp(18px, 2.2vw, 26px); font-weight: 700; color: rgb(var(--ink-2)); }
/* two lines on desktop: the headline is four words, the scene beside it carries the rest */
.zl-h1 { display: block; font-size: clamp(38px, 4.1vw, 54px); line-height: 0.92; text-transform: uppercase; color: rgb(var(--gold)); }
.zl-lead { margin-top: 26px; max-width: 42ch; font-size: 20px; line-height: 1.5; color: rgb(var(--ink-2)); }
.zl-ctas { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 28px; }

/* prices */
.zl-prices { display: grid; margin-top: 44px; border-top: 2.5px solid var(--rule); border-bottom: 2.5px solid var(--rule); }
@media (min-width: 1024px) { .zl-prices { grid-template-columns: repeat(3, minmax(0, 1fr)); column-gap: 32px; } .zl-prc.is-coupon { margin: -14px 0; } }
@media (max-width: 1023px) { .zl-prc + .zl-prc { border-top: 1.5px solid var(--rule); } }
.zl-prc { position: relative; display: flex; flex-direction: column; gap: 14px; padding: 28px; }
.zl-prc.is-coupon { background: rgb(var(--canvas)); }
.zl-prc h3 { font-family: var(--font-display), sans-serif; font-weight: 900; font-stretch: 130%; font-size: 32px; line-height: 1; text-transform: uppercase; }
.zl-pr { font-size: 15px; color: rgb(var(--ink-2)); }
.zl-pr b { font-family: var(--font-display), sans-serif; font-size: 26px; font-weight: 900; color: rgb(var(--ink)); }
.zl-prc ul { margin: 0 0 8px; padding: 0; list-style: none; display: grid; gap: 10px; }
.zl-prc li { display: flex; gap: 12px; font-size: 16px; line-height: 1.4; }
.zl-prc li::before { content: ''; width: 12px; height: 3px; margin-top: 10px; flex: none; background: rgb(var(--ink)); }
.zl-prc.is-coupon li::before { background: rgb(var(--gold)); }
.zl-prc :deep(a) { margin-top: auto; align-self: flex-start; }

/* rack */
.zl-rack { display: grid; gap: 28px; margin-top: 44px; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }
.zl-rk { display: grid; grid-template-columns: 130px minmax(0, 1fr); gap: 18px; align-items: center; color: inherit; text-decoration: none; }
.zl-rk-zine { aspect-ratio: 3 / 4; display: flex; flex-direction: column; border: 2.5px solid var(--rule); }
.zl-dots { flex: 1; background: radial-gradient(circle, rgb(var(--gold)) 46%, transparent 48%) 0 0 / 7px 7px, rgb(var(--s2)); }
.zl-rk-zine b { padding: 10px; background: rgb(var(--gold)); color: #fff; font-family: var(--font-display), sans-serif; font-weight: 900; font-size: 18px; line-height: 0.95; text-transform: uppercase; overflow-wrap: anywhere; }
.zl-rk h3 { font-family: var(--font-display), sans-serif; font-weight: 900; font-stretch: 120%; font-size: 22px; text-transform: uppercase; }
.zl-rk p { margin-top: 6px; font-size: 14px; color: rgb(var(--ink-2)); }
</style>
