<script setup lang="ts">
// "Category ideas to start from" on the Fanzine landing (review 2026-10-06):
// breadth, not a list to read - the ideas run past as stamps in one marquee,
// the page's only one, and the three ready-made packs sit under it as a
// running bill, not as three equal cards. All ideas are on /ideas.
//
// The first pass of the marquee is the real list (search and screen readers
// read it once); the second copy that makes the loop seamless is aria-hidden.
import UiButton from '~/components/ui/UiButton.vue'
import { IDEA_GROUPS, IDEA_TOTAL } from '~/data/ideas'
import { TEMPLATES } from '~/data/templates'

// breadth, not targets: the stamps just run past, nothing to click or pause for;
// the packs under them are what you click (review 2026-10-08)
const ideas = IDEA_GROUPS.flatMap((g) => g.items.slice(0, 6))
// a pack is a kind of show, said in a line - the marquee above is the list
const PACK_LINES: Record<string, string> = {
  classics: 'The categories every streaming award show runs.',
  chat: 'The regulars, the mods, the emotes.',
  funny: 'Fails, rage quits and streams that went sideways.',
}
</script>

<template>
  <section id="ideas" class="zi">
    <div class="shell">
      <h2 class="zi-h zine-display">Category ideas to start from</h2>
    </div>

    <div class="zi-band">
      <ul class="zi-run">
        <li v-for="(idea, i) in ideas" :key="idea" :class="`t${i % 4}`">{{ idea }}</li>
      </ul>
      <ul class="zi-run" aria-hidden="true">
        <li v-for="(idea, i) in ideas" :key="idea" :class="`t${i % 4}`">{{ idea }}</li>
      </ul>
    </div>

    <div class="shell">
      <ul class="zi-packs">
        <li v-for="t in TEMPLATES" :key="t.id">
          <NuxtLink to="/create" class="zi-pack">
            <b class="zine-display">{{ t.name }}</b>
            <span>{{ PACK_LINES[t.id] }}</span>
            <em class="tnum">{{ t.nominations.length }} categories</em>
          </NuxtLink>
        </li>
      </ul>
      <p class="zi-more"><UiButton to="/ideas" variant="ghost">All {{ IDEA_TOTAL }} category ideas</UiButton></p>
    </div>
  </section>
</template>

<style scoped>
.zi { padding: 72px 0; border-top: 2px solid rgb(var(--ink)); overflow: hidden; }
.zi-h { max-width: 14ch; font-size: clamp(36px, 5vw, 60px); line-height: 0.9; text-transform: uppercase; color: rgb(var(--gold)); text-wrap: balance; }

/* the marquee: stamps running past */
.zi-band { display: flex; margin: 40px 0; padding: 18px 0; border-block: 2.5px solid rgb(var(--ink)); background: radial-gradient(circle, rgb(var(--gold) / 0.25) 46%, transparent 48%) 0 0 / 9px 9px, rgb(var(--s2)); }
.zi-run { display: flex; flex: none; gap: 18px; margin: 0; padding: 0 9px; list-style: none; animation: zi-run 70s linear infinite; }
.zi-run li { flex: none; padding: 8px 14px 7px; border: 3px double currentColor; background: rgb(var(--canvas)); font: 800 15px/1 var(--font-display), sans-serif; font-stretch: 115%; letter-spacing: 0.04em; text-transform: uppercase; white-space: nowrap; }
.zi-run .t0 { color: rgb(var(--gold-text)); transform: rotate(-2deg); }
.zi-run .t1 { color: rgb(var(--ink)); transform: rotate(1.5deg); }
.zi-run .t2 { color: rgb(var(--pink-ink)); transform: rotate(-1deg); }
.zi-run .t3 { color: rgb(var(--ink)); transform: rotate(2deg); }
@keyframes zi-run { to { transform: translateX(-100%); } }
@media (prefers-reduced-motion: reduce) { .zi-run { animation: none; } .zi-band { overflow-x: auto; } }

/* the packs: a running bill, one line each */
.zi-packs { margin: 0; padding: 0; list-style: none; border-top: 2.5px solid rgb(var(--ink)); }
.zi-pack { display: grid; gap: 4px 24px; align-items: baseline; padding: 18px 0; border-bottom: 1.5px dashed rgb(var(--hair)); color: inherit; text-decoration: none; transition: padding-left 0.25s cubic-bezier(0.16, 1, 0.3, 1); }
@media (min-width: 768px) { .zi-pack { grid-template-columns: minmax(0, 1.1fr) minmax(0, 1.3fr) auto; } }
.zi-pack b { font-size: clamp(22px, 2.6vw, 30px); text-transform: uppercase; }
.zi-pack span { font-size: 16px; color: rgb(var(--ink-2)); }
.zi-pack em { font-style: normal; font-weight: 800; font-size: 14px; color: rgb(var(--gold-text)); }
.zi-pack:hover { padding-left: 14px; }
.zi-pack:hover b { color: rgb(var(--gold)); }
.zi-more { margin-top: 28px; }
</style>
