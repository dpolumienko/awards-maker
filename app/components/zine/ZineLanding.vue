<script setup lang="ts">
// The landing in the Fanzine version (Concept C). Same promise, same H1, same
// FAQ (handed in by pages/index.vue, which also owns the page's schema), same
// data as the Current landing - packs from data/templates, prices from
// data/plans, steps from data/steps, shows from the catalog. What changes is how
// it is printed: covers on a rack, a three-panel strip, a ballot slip marked with
// a pen, a cut-out coupon and a letters page.
import { computed, ref } from 'vue'
import UiButton from '~/components/ui/UiButton.vue'
import UiIcon from '~/components/ui/UiIcon.vue'
import InteractiveAccordion from '~/components/ui/InteractiveAccordion.vue'
import ZinePen from './ZinePen.vue'
import ZineBallotRows from './ZineBallotRows.vue'
// the Current landing's other sections, each with its Fanzine print
import ZinePageProof from './ZinePageProof.vue'
import ZineFeatures from './ZineFeatures.vue'
import ZineIdeas from './ZineIdeas.vue'
import ZineCta from './ZineCta.vue'
import { STEPS } from '~/data/steps'
import { TEMPLATES } from '~/data/templates'
import { PLANS } from '~/data/plans'
import { useCatalog, useCatalogOpen } from '~/composables/useAwards'
import type { FaqItem } from '~/components/sections/FaqSection.vue'

defineProps<{ faq: FaqItem[] }>()

const catalogOpen = useCatalogOpen()
const { data } = await useCatalog({ tolerant: true })
const rack = computed(() => (data.value?.awards ?? []).slice(0, 3))

// the two covers on the stand are examples, built from two of the real packs
const covers = [TEMPLATES[2]!, TEMPLATES[1]!]
// the strip's ballot and its winner panel share one pick
const STRIP = ['forsenE', 'OMEGALUL', 'Pog']
const stripPick = ref(0)
// the slip arrives half filled in: one pick made, one still to make
const slipPicks = ref([1, -1])
// A pack is a kind of show, not a list - the ideas section below is the list
// (review 2026-10-06: the two read alike).
const PACK_LINES: Record<string, string> = {
  classics: 'The big night: the categories every streaming award show runs.',
  chat: 'For your own chat: the regulars, the mods, the emotes.',
  funny: 'The blooper reel: fails, rage quits and streams that went sideways.',
}
</script>

<template>
  <div class="zl">
    <!-- the cover -->
    <section class="zl-cover">
      <div class="shell zl-cover-grid">
        <div>
          <h1>
            <span class="zl-kicker">Awards Maker for streamers:</span>
            <span class="zl-h1 zine-display">Run your own awards show</span>
          </h1>
          <p class="zl-lead">
            Run your own streamer awards: pick the categories, nominate channels from Twitch, Kick and YouTube or your
            community's favorite meme, and let your viewers vote for every winner.
          </p>
          <div class="zl-ctas">
            <UiButton to="/create">Create your awards</UiButton>
            <UiButton v-if="catalogOpen" to="/catalog" variant="ghost">Browse the catalog</UiButton>
            <UiButton v-else to="/ideas" variant="ghost">Category ideas</UiButton>
          </div>
          <p class="zl-small">Free. You'll log in with Twitch to create awards.</p>
        </div>
        <div class="zl-stand" role="img" aria-label="Example: two awards on a rack, built from the ready-made packs">
          <article v-for="(c, i) in covers" :key="c.id" class="zl-issue" :class="i ? 'zl-issue-2' : 'zl-issue-1'">
            <div class="zl-issue-top"><span>Example</span><span>{{ c.nominations.length }} categories</span></div>
            <p class="zl-issue-h zine-display" :class="i && 'is-blue'">{{ c.name }}</p>
            <div v-if="!i" class="zl-issue-art" />
            <ul class="zl-issue-lines">
              <li v-for="n in c.nominations.slice(0, i ? 5 : 2)" :key="n">{{ n }}</li>
            </ul>
          </article>
          <p class="zl-price">Free<small>with a Twitch login</small></p>
        </div>
      </div>
    </section>

    <ZinePageProof />

    <!-- how an awards gets made: three panels -->
    <section class="zl-sec">
      <div class="shell">
        <h2 class="zl-h2 zine-display">How an awards gets made</h2>
        <div class="zl-strip">
          <div class="zl-panel">
            <div class="zl-scene zl-dots">
              <div class="zl-form">
                <p><span>Awards</span><i>Chat Awards 2026</i></p>
                <p><span>Category</span><i>Best emote</i></p>
                <p><span>Nominee</span><i>forsenE</i></p>
                <p><span>Nominee</span><i>OMEGALUL</i></p>
              </div>
            </div>
            <div class="zl-cap"><h3>{{ STEPS[0]!.title }}</h3><p>{{ STEPS[0]!.body }}</p></div>
          </div>
          <div class="zl-panel">
            <div class="zl-scene zl-grey">
              <p class="zl-chat"><b>ishowspeed:</b> ballot's up, one pick per category</p>
              <ZineBallotRows v-model="stripPick" class="zl-mini" :names="STRIP" label="Best emote" />
            </div>
            <div class="zl-cap"><h3>{{ STEPS[1]!.title }}</h3><p>{{ STEPS[1]!.body }}</p></div>
          </div>
          <div class="zl-panel">
            <div class="zl-scene zl-flood">
              <div>
                <ZinePen :key="stripPick" class="zl-flood-name">{{ STRIP[stripPick] }}</ZinePen>
                <p>Best emote · winner</p>
              </div>
            </div>
            <div class="zl-cap"><h3>{{ STEPS[2]!.title }}</h3><p>{{ STEPS[2]!.body }}</p></div>
          </div>
        </div>
      </div>
    </section>

    <!-- the ballot slip -->
    <section class="zl-sec">
      <div class="shell">
        <h2 class="zl-h2 zine-display">Let chat vote for every winner</h2>
        <div class="zl-slipwrap">
          <div class="zl-notes">
            <article><h3>The link goes wherever your viewers are</h3><p>No account needed to look at the nominees.</p></article>
            <article><h3>One pick per category</h3><p>Choosing comes first, nothing blocks it.</p></article>
          </div>
          <div class="zl-slip">
            <div class="zl-slip-hd"><b>Ballot</b><span class="ui-badge" data-tone="live">Voting open</span></div>
            <h4>Streamer of the year</h4>
            <ZineBallotRows v-model="slipPicks[0]" ruled :names="['forsen', 'maryana', 'nightcrew']" label="Streamer of the year" />
            <h4>Best emote</h4>
            <ZineBallotRows v-model="slipPicks[1]" ruled :names="['forsenE', 'OMEGALUL']" label="Best emote" />
            <p class="zl-sign">One ballot per Twitch account, signed at submit.</p>
          </div>
          <div class="zl-notes zl-notes-r">
            <article><h3>The vote is counted</h3><p>Tied to a real account, so the result holds up.</p></article>
          </div>
        </div>
      </div>
    </section>

    <ZineFeatures />

    <!-- packs to start from -->
    <section class="zl-sec">
      <div class="shell">
        <h2 class="zl-h2 zine-display">Packs to start from</h2>
        <p class="zl-intro">In the builder, each pack fills in five categories with one click. Rename or drop any of them after.</p>
        <div class="zl-packs">
          <NuxtLink v-for="(t, i) in TEMPLATES" :key="t.id" to="/create" class="zl-pack">
            <div class="zl-zine" :class="i === 1 && 'is-ink'">
              <div class="zl-band"><small>Tonight</small><b>{{ t.name }}</b></div>
              <p class="zl-line">{{ PACK_LINES[t.id] }}</p>
              <span class="zl-n tnum">{{ t.nominations.length }}<small>categories</small></span>
            </div>
            <span class="zl-use">Use this pack</span>
          </NuxtLink>
        </div>
      </div>
    </section>

    <ZineIdeas />

    <!-- prices: the paid one is a coupon -->
    <section class="zl-sec">
      <div class="shell">
        <h2 class="zl-h2 zine-display">Free, paid, or we run it</h2>
        <p class="zl-intro">The paid tier is a one-off purchase for one awards, not a subscription.</p>
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

    <!-- on the rack: real shows only, like the Current landing -->
    <section v-if="catalogOpen && rack.length" class="zl-sec">
      <div class="shell">
        <h2 class="zl-h2 zine-display">On the rack right now</h2>
        <div class="zl-rack">
          <NuxtLink v-for="a in rack" :key="a.slug" :to="`/a/${a.slug}`" class="zl-rk">
            <div class="zl-rk-zine"><span class="zl-dots" /><b>{{ a.name }}</b></div>
            <div><h3>{{ a.name }}</h3><p>by {{ a.host.name }} · {{ a.categories }} categories · {{ a.voters }} voters</p></div>
          </NuxtLink>
        </div>
        <p class="mt-8"><UiButton to="/catalog">Browse all community awards</UiButton></p>
      </div>
    </section>

    <!-- letters page: the FAQ, the same accordion as on /create -->
    <section class="zl-sec zl-last">
      <div class="shell">
        <h2 class="zl-h2 zine-display">Letters</h2>
        <div class="mt-10 border-t border-hair">
          <InteractiveAccordion :items="faq" />
        </div>
        <p class="zl-end">
          <UiIcon name="chevron-right" :size="14" />
          <NuxtLink to="/create">Start your own awards</NuxtLink>
        </p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.zl { --rule: rgb(var(--ink)); }
.zl-sec { padding: 72px 0; border-top: 2px solid var(--rule); }
.zl-last { padding-bottom: 96px; }
.zl-h2 { font-size: clamp(40px, 6vw, 72px); line-height: 0.88; text-transform: uppercase; color: rgb(var(--gold)); max-width: 14ch; text-wrap: balance; }
.zl-intro { margin-top: 18px; max-width: 58ch; font-size: 19px; line-height: 1.55; color: rgb(var(--ink-2)); }

/* cover */
.zl-cover { padding: 48px 0 72px; overflow-x: clip; }
@media (max-width: 639px) { .zl-issue-h { font-size: 32px; } .zl-issue-lines li { font-size: 15px; } }
.zl-cover-grid { display: grid; gap: 48px; grid-template-columns: minmax(0, 1fr); }
@media (min-width: 1024px) { .zl-cover-grid { grid-template-columns: minmax(0, 1fr) 500px; } }
.zl-kicker { display: block; margin-bottom: 14px; font-size: clamp(18px, 2.4vw, 28px); font-weight: 700; color: rgb(var(--ink-2)); }
.zl-h1 { display: block; max-width: 11ch; font-size: clamp(42px, 6.2vw, 84px); line-height: 0.9; text-transform: uppercase; color: rgb(var(--gold)); }
.zl-lead { margin-top: 30px; max-width: 46ch; font-size: 20px; line-height: 1.5; color: rgb(var(--ink-2)); }
.zl-ctas { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 28px; }
.zl-small { margin-top: 12px; font-size: 15px; color: rgb(var(--ink-muted)); }
.zl-stand { position: relative; height: 560px; }
@media (max-width: 1023px) { .zl-stand { height: 480px; max-width: 460px; } }
.zl-issue { position: absolute; width: min(360px, 78%); height: 470px; padding: 20px; display: flex; flex-direction: column; border: 2px solid var(--rule); background: rgb(var(--canvas)); }
.zl-issue-1 { left: 0; top: 40px; transform: rotate(-6deg); }
.zl-issue-2 { right: 0; top: 0; transform: rotate(3deg); }
.zl-issue-top { display: flex; justify-content: space-between; padding-bottom: 10px; border-bottom: 2px solid var(--rule); font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
.zl-issue-h { margin-top: 16px; font-size: 44px; line-height: 0.88; text-transform: uppercase; }
.zl-issue-h.is-blue { color: rgb(var(--gold)); }
.zl-issue-art { height: 140px; margin-top: 14px; background: radial-gradient(circle, rgb(var(--gold)) 46%, transparent 48%) 0 0 / 7px 7px; }
.zl-issue-lines { margin: auto 0 0; padding: 0; list-style: none; display: grid; gap: 8px; }
.zl-issue-lines li { padding-top: 8px; border-top: 1.5px solid var(--rule); font-family: var(--font-display), sans-serif; font-weight: 800; font-stretch: 118%; font-size: 18px; line-height: 1.05; text-transform: uppercase; }
.zl-price { position: absolute; right: 4px; bottom: -10px; z-index: 2; width: 140px; height: 140px; padding: 0 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 50%; background: rgb(var(--gold)); color: #fff; text-align: center; transform: rotate(12deg); font-family: var(--font-display), sans-serif; font-weight: 900; font-stretch: 120%; font-size: 24px; text-transform: uppercase; }
.zl-price small { margin-top: 4px; font-family: var(--font-body), sans-serif; font-size: 13px; font-weight: 600; text-transform: none; line-height: 1.25; }

/* strip */
.zl-strip { display: grid; gap: 18px; margin-top: 44px; }
@media (min-width: 1024px) { .zl-strip { grid-template-columns: repeat(3, minmax(0, 1fr)); } .zl-scene { height: 280px; } }
.zl-panel { display: flex; flex-direction: column; border: 2.5px solid var(--rule); }
.zl-scene { position: relative; min-height: 240px; padding: 20px; overflow: hidden; display: flex; flex-direction: column; justify-content: center; }
.zl-dots { background: radial-gradient(circle, rgb(var(--gold)) 46%, transparent 48%) 0 0 / 7px 7px, #D5E8F4; }
.zl-grey { background: rgb(var(--s2)); }
.zl-flood { display: grid; place-items: center; text-align: center; background: rgb(var(--gold)); color: #fff; }
.zl-flood :deep(.zine-pen-line) { mix-blend-mode: normal; }
.zl-flood-name { font-family: var(--font-display), sans-serif; font-weight: 900; font-stretch: 125%; font-size: 46px; }
.zl-flood p { margin-top: 26px; font-size: 13px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
.zl-cap { padding: 16px 18px; border-top: 2.5px solid var(--rule); background: rgb(var(--canvas)); }
.zl-cap h3 { font-family: var(--font-display), sans-serif; font-weight: 900; font-stretch: 120%; font-size: 21px; line-height: 1.05; text-transform: uppercase; }
.zl-cap p { margin-top: 8px; font-size: 15px; line-height: 1.5; color: rgb(var(--ink-2)); }
.zl-form { max-width: 300px; display: grid; gap: 10px; padding: 14px; border: 2px solid var(--rule); background: rgb(var(--canvas)); transform: rotate(-2deg); }
.zl-form p { display: flex; align-items: flex-end; gap: 8px; font-size: 13px; font-weight: 600; }
.zl-form i { flex: 1; border-bottom: 1.5px solid var(--rule); font-style: normal; font-weight: 700; color: rgb(var(--gold-text)); }
.zl-chat { padding: 10px 12px; border: 2px solid var(--rule); background: rgb(var(--canvas)); font-size: 15px; }
.zl-chat b { color: #7B2FF7; }
.zl-mini { margin-top: 18px; padding: 14px 16px; border: 2px solid var(--rule); background: rgb(var(--canvas)); }

/* slip */
.zl-notes { display: grid; gap: 24px; }
.zl-slipwrap { display: grid; gap: 32px; margin-top: 44px; align-items: start; }
@media (min-width: 1024px) { .zl-slipwrap { grid-template-columns: minmax(0, 1fr) 480px minmax(0, 1fr); } .zl-notes { padding-top: 30px; gap: 110px; } .zl-notes-r { padding-top: 150px; } }
.zl-notes h3 { font-family: var(--font-display), sans-serif; font-weight: 900; font-stretch: 120%; font-size: 22px; line-height: 1.05; text-transform: uppercase; color: rgb(var(--gold-text)); }
.zl-notes p { margin-top: 8px; color: rgb(var(--ink-2)); }
.zl-slip { padding: 22px 24px; border: 2.5px solid var(--rule); background: rgb(var(--canvas)); transform: rotate(1deg); }
.zl-slip-hd { display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 2px solid var(--rule); }
.zl-slip-hd b { font-family: var(--font-display), sans-serif; font-weight: 900; font-stretch: 130%; font-size: 22px; text-transform: uppercase; }
.zl-slip h4 { margin: 18px 0 6px; font-size: 13px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: rgb(var(--ink-2)); }
.zl-sign { margin-top: 20px; padding-top: 10px; border-top: 1.5px solid var(--rule); font-size: 14px; color: rgb(var(--ink-2)); }

/* packs */
.zl-packs { display: grid; gap: 24px; margin-top: 44px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
.zl-pack .zl-zine { aspect-ratio: auto; min-height: 300px; }
.zl-pack .zl-band { min-height: 0; padding-bottom: 28px; }
.zl-pack { display: grid; gap: 12px; align-content: start; color: inherit; text-decoration: none; }
.zl-zine { aspect-ratio: 3 / 4; display: flex; flex-direction: column; border: 2.5px solid var(--rule); background: rgb(var(--canvas)); }
.zl-band { min-height: 46%; padding: 16px; background: rgb(var(--gold)); color: #fff; }
.zl-band small { display: block; margin-bottom: 10px; font-size: 12px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; opacity: 0.85; }
.zl-line { padding: 14px 16px 0; font-size: 15px; line-height: 1.45; color: rgb(var(--ink-2)); }
.zl-zine.is-ink .zl-band { background: rgb(var(--ink)); color: rgb(var(--canvas)); }
.zl-band b { display: block; font-family: var(--font-display), sans-serif; font-weight: 900; font-stretch: 112%; font-size: 27px; line-height: 0.92; text-transform: uppercase; overflow-wrap: anywhere; }
.zl-n { margin-top: auto; padding: 0 16px 14px; font-family: var(--font-display), sans-serif; font-weight: 900; font-stretch: 130%; font-size: 100px; line-height: 0.8; color: rgb(var(--gold)); }
.zl-zine.is-ink .zl-n { color: rgb(var(--ink)); }
.zl-n small { margin-left: 6px; font-family: var(--font-body), sans-serif; font-stretch: 100%; font-size: 17px; font-weight: 800; }
.zl-use { font-family: var(--font-display), sans-serif; font-weight: 800; font-stretch: 118%; font-size: 14px; letter-spacing: 0.04em; text-transform: uppercase; color: rgb(var(--gold-text)); }
.zl-pack:hover .zl-use { text-decoration: underline; text-underline-offset: 4px; }

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
.zl-rk-zine .zl-dots { flex: 1; }
.zl-rk-zine b { padding: 10px; background: rgb(var(--gold)); color: #fff; font-family: var(--font-display), sans-serif; font-weight: 900; font-size: 18px; line-height: 0.95; text-transform: uppercase; overflow-wrap: anywhere; }
.zl-rk h3 { font-family: var(--font-display), sans-serif; font-weight: 900; font-stretch: 120%; font-size: 22px; text-transform: uppercase; }
.zl-rk p { margin-top: 6px; font-size: 14px; color: rgb(var(--ink-2)); }

/* letters */
.zl-end { display: flex; align-items: center; gap: 6px; margin-top: 8px; font-weight: 700; }
.zl-end a { color: rgb(var(--ink)); text-underline-offset: 4px; }
</style>
