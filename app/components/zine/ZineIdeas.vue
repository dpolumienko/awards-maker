<script setup lang="ts">
// "End of year awards category ideas" on the Fanzine landing: a contents page.
// Three groups as columns of dashed rows, no emoji and no drifting rows - the
// ideas are text a crawler and a reader can both take in. Same data and intro
// as sections/CategoryIdeas.vue; all of them live on /ideas.
import UiButton from '~/components/ui/UiButton.vue'
import { IDEA_GROUPS, IDEA_TOTAL } from '~/data/ideas'

// five on show per group, the rest behind a button - still in the HTML for search
const SHOWN = 5
const groups = IDEA_GROUPS.slice(0, 3)
const inGroups = groups.reduce((n, g) => n + g.items.length, 0)
</script>

<template>
  <section id="ideas" class="zi">
    <div class="shell">
      <h2 class="zi-h zine-display">End of year awards category ideas</h2>
      <p class="zi-intro">Stuck? Here are {{ inGroups }} of them, in three groups - all {{ IDEA_TOTAL }} are one page away.</p>
      <div class="zi-cols">
        <div v-for="g in groups" :key="g.id" class="zi-col">
          <h3>{{ g.title }}</h3>
          <ol>
            <li v-for="item in g.items.slice(0, SHOWN)" :key="item">{{ item }}</li>
          </ol>
          <details v-if="g.items.length > SHOWN" class="zi-more-ideas">
            <summary>
              <span class="zi-open">Show {{ g.items.length - SHOWN }} more</span><span class="zi-close">Show fewer</span>
            </summary>
            <ol :start="SHOWN + 1">
              <li v-for="item in g.items.slice(SHOWN)" :key="item">{{ item }}</li>
            </ol>
          </details>
        </div>
      </div>
      <p class="zi-more"><UiButton to="/ideas" variant="ghost" size="sm">All {{ IDEA_TOTAL }} category ideas</UiButton></p>
    </div>
  </section>
</template>

<style scoped>
.zi { padding: 72px 0; border-top: 2px solid rgb(var(--ink)); }
.zi-h { max-width: 14ch; font-size: clamp(40px, 6vw, 72px); line-height: 0.88; text-transform: uppercase; color: rgb(var(--gold)); text-wrap: balance; }
.zi-intro { margin-top: 18px; max-width: 58ch; font-size: 19px; line-height: 1.55; color: rgb(var(--ink-2)); }
.zi-cols { display: grid; gap: 28px 40px; margin-top: 44px; }
@media (min-width: 768px) { .zi-cols { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
.zi-col h3 { padding-bottom: 10px; border-bottom: 2.5px solid rgb(var(--ink)); font: 900 21px/1.05 var(--font-display), sans-serif; font-stretch: 120%; text-transform: uppercase; }
.zi-col ol { margin: 0; padding: 0; list-style: none; counter-reset: i; }
.zi-col details ol { counter-reset: i 5; }
.zi-more-ideas summary { display: inline-flex; margin-top: 12px; padding: 7px 12px; border: 2px solid rgb(var(--ink)); cursor: pointer; list-style: none; font: 800 13px/1 var(--font-display), sans-serif; font-stretch: 115%; letter-spacing: 0.04em; text-transform: uppercase; }
.zi-more-ideas summary::-webkit-details-marker { display: none; }
.zi-more-ideas summary:hover { background: rgb(var(--gold) / 0.15); }
.zi-close, .zi-more-ideas[open] .zi-open { display: none; }
.zi-more-ideas[open] .zi-close { display: inline; }
.zi-col li { display: grid; grid-template-columns: 28px minmax(0, 1fr); gap: 8px; padding: 9px 0; border-bottom: 1.5px dashed rgb(var(--hair)); font-size: 16px; counter-increment: i; }
.zi-col li::before { content: counter(i, decimal-leading-zero); font: 800 12px/1.9 var(--font-display), sans-serif; color: rgb(var(--gold-text)); }
.zi-more { margin-top: 28px; }
</style>
