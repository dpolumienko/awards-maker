<script setup lang="ts">
// "End of year awards category ideas" on the Fanzine landing: a contents page.
// Three groups as columns of dashed rows, no emoji and no drifting rows - the
// ideas are text a crawler and a reader can both take in. Same data and intro
// as sections/CategoryIdeas.vue; all of them live on /ideas.
import UiButton from '~/components/ui/UiButton.vue'
import { IDEA_GROUPS, IDEA_TOTAL } from '~/data/ideas'

const groups = IDEA_GROUPS.slice(0, 3).map((g) => ({ ...g, items: g.items.slice(0, 10) }))
</script>

<template>
  <section id="ideas" class="zi">
    <div class="shell">
      <h2 class="zi-h zine-display">End of year awards category ideas</h2>
      <p class="zi-intro">Stuck? Here are 30 of them, in three groups - all {{ IDEA_TOTAL }} are one page away.</p>
      <div class="zi-cols">
        <div v-for="g in groups" :key="g.id" class="zi-col">
          <h3>{{ g.title }}</h3>
          <ol>
            <li v-for="item in g.items" :key="item">{{ item }}</li>
          </ol>
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
.zi-col li { display: grid; grid-template-columns: 28px minmax(0, 1fr); gap: 8px; padding: 9px 0; border-bottom: 1.5px dashed rgb(var(--hair)); font-size: 16px; counter-increment: i; }
.zi-col li::before { content: counter(i, decimal-leading-zero); font: 800 12px/1.9 var(--font-display), sans-serif; color: rgb(var(--gold-text)); }
.zi-more { margin-top: 28px; }
</style>
