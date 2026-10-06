<script setup lang="ts">
// "This is the page your awards get", printed: a proof sheet of an awards page
// with crop marks and the editor's notes in the margin. Same copy and the same
// promise as sections/AwardPagePreview.vue; clicking a nominee moves the pen
// circle, the way the real ballot does.
import { ref } from 'vue'
import ZinePen from './ZinePen.vue'
import PlatformDot from '~/components/ui/PlatformDot.vue'

const picked = ref(1)
const nominees = [
  { name: 'nightowl_tv', sub: 'Twitch channel', platform: 'twitch' as const },
  { name: 'mira_plays', sub: 'Kick channel', platform: 'kick' as const },
  { name: 'The 3am raid', sub: 'Text nominee' },
]
const colophon = [
  ['Categories', '5'],
  ['Nominees', '17'],
  ['Voting closes', '12 December'],
]
const rules = [
  'Any Twitch account can vote, one ballot each.',
  'One vote per category, locked once you submit.',
  'Counts stay hidden until the host announces the winners.',
]
</script>

<template>
  <section class="zp">
    <div class="shell">
      <h2 class="zp-h zine-display">This is the page your awards get</h2>
      <p class="zp-intro">
        Publishing gives you a page like this one: your categories and nominees, a countdown to the end of voting, and
        the winners once you announce them. It stays online after the show.
      </p>

      <div class="zp-desk">
        <figure class="zp-sheet" aria-label="Example awards page">
          <span class="zp-crop zp-crop-tl" aria-hidden="true" /><span class="zp-crop zp-crop-br" aria-hidden="true" />
          <p class="zp-url">awards.streamscharts.com/a/night-owl-awards-2026</p>
          <div class="zp-head">
            <span class="zp-host"><span class="zp-av">NO</span>nightowl_tv <PlatformDot platform="twitch" :label="false" /></span>
            <span class="ui-badge" data-tone="live">Voting open</span>
          </div>
          <p class="zp-title zine-display">Night Owl Awards 2026</p>
          <dl class="zp-colophon">
            <div v-for="[k, v] in colophon" :key="k"><dt>{{ k }}</dt><dd class="tnum">{{ v }}</dd></div>
          </dl>
          <div class="zp-body">
            <div>
              <p class="zp-cat">Streamer of the year <span>Mark one</span></p>
              <div role="radiogroup" aria-label="Streamer of the year, example">
                <button
                  v-for="(n, i) in nominees"
                  :key="n.name"
                  type="button"
                  role="radio"
                  class="zp-row"
                  :aria-checked="picked === i"
                  @click="picked = i"
                >
                  <span class="zp-box" aria-hidden="true" />
                  <span class="zp-name"><ZinePen :on="picked === i">{{ n.name }}</ZinePen></span>
                  <span class="zp-sub"><PlatformDot v-if="n.platform" :platform="n.platform" :label="false" />{{ n.sub }}</span>
                </button>
              </div>
            </div>
            <ol class="zp-rules">
              <li v-for="r in rules" :key="r">{{ r }}</li>
            </ol>
          </div>
        </figure>

        <aside class="zp-notes" aria-label="What is on the page">
          <p><b>1</b> Your categories and nominees, any channel or plain text.</p>
          <p><b>2</b> A countdown to the end of voting, in the show's own time zone.</p>
          <p><b>3</b> The winners, the moment you announce them on stream.</p>
        </aside>
      </div>
    </div>
  </section>
</template>

<style scoped>
.zp { padding: 72px 0; border-top: 2px solid rgb(var(--ink)); }
.zp-h { max-width: 14ch; font-size: clamp(40px, 6vw, 72px); line-height: 0.88; text-transform: uppercase; color: rgb(var(--gold)); text-wrap: balance; }
.zp-intro { margin-top: 18px; max-width: 58ch; font-size: 19px; line-height: 1.55; color: rgb(var(--ink-2)); }
.zp-desk { display: grid; gap: 32px; margin-top: 44px; align-items: start; }
@media (min-width: 1024px) { .zp-desk { grid-template-columns: minmax(0, 1fr) 280px; } }
.zp-sheet { position: relative; margin: 0; padding: 26px 28px 30px; border: 2.5px solid rgb(var(--ink)); background: rgb(var(--canvas)); transform: rotate(-0.6deg); }
.zp-crop { position: absolute; width: 18px; height: 18px; border: 0 solid rgb(var(--ink)); }
.zp-crop-tl { left: -12px; top: -12px; border-left-width: 2px; border-top-width: 2px; }
.zp-crop-br { right: -12px; bottom: -12px; border-right-width: 2px; border-bottom-width: 2px; }
.zp-url { padding-bottom: 10px; border-bottom: 1.5px dashed rgb(var(--hair)); font-size: 12px; letter-spacing: 0.04em; color: rgb(var(--ink-muted)); }
.zp-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-top: 16px; }
.zp-host { display: flex; align-items: center; gap: 8px; font-weight: 700; }
.zp-av { display: grid; place-items: center; width: 30px; height: 30px; background: rgb(var(--gold)); color: #fff; font: 900 11px/1 var(--font-display), sans-serif; }
.zp-title { margin-top: 14px; font-size: clamp(34px, 5vw, 58px); line-height: 0.9; text-transform: uppercase; color: rgb(var(--gold)); }
.zp-colophon { display: flex; flex-wrap: wrap; gap: 0 28px; margin: 18px 0 0; padding: 10px 0; border-top: 2px solid rgb(var(--ink)); border-bottom: 2px solid rgb(var(--ink)); }
.zp-colophon div { display: flex; gap: 8px; align-items: baseline; font-size: 14px; }
.zp-colophon dt { color: rgb(var(--ink-2)); }
.zp-colophon dd { margin: 0; font-weight: 800; }
.zp-body { display: grid; gap: 26px; margin-top: 22px; }
@media (min-width: 768px) { .zp-body { grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr); } }
.zp-cat { display: flex; align-items: baseline; gap: 12px; padding-bottom: 8px; border-bottom: 2px solid rgb(var(--ink)); font: 900 20px/1.1 var(--font-display), sans-serif; font-stretch: 120%; text-transform: uppercase; }
.zp-cat span { font: 600 13px/1 var(--font-body), sans-serif; text-transform: none; color: rgb(var(--ink-2)); }
.zp-row { display: grid; grid-template-columns: 24px minmax(0, 1fr); gap: 2px 14px; align-items: center; width: 100%; padding: 12px 0; border: 0; border-bottom: 1.5px dashed rgb(var(--hair)); background: none; text-align: left; cursor: pointer; }
.zp-box { grid-row: span 2; width: 22px; height: 22px; border: 2.5px solid rgb(var(--ink)); }
.zp-row[aria-checked='true'] .zp-box { background: rgb(var(--ink)); }
.zp-row:focus-visible { outline: 3px solid rgb(var(--gold)); outline-offset: 2px; }
.zp-name { font: 800 22px/1.1 var(--font-display), sans-serif; font-stretch: 115%; }
.zp-sub { display: flex; align-items: center; gap: 6px; font-size: 13px; color: rgb(var(--ink-2)); }
.zp-rules { margin: 0; padding: 0; list-style: none; counter-reset: r; display: grid; gap: 12px; align-content: start; }
.zp-rules li { display: grid; grid-template-columns: 22px minmax(0, 1fr); gap: 8px; font-size: 14px; line-height: 1.45; color: rgb(var(--ink-2)); counter-increment: r; }
.zp-rules li::before { content: counter(r); font: 900 17px/1 var(--font-display), sans-serif; color: rgb(var(--gold)); }
.zp-notes { display: grid; gap: 18px; padding-top: 10px; }
.zp-notes p { position: relative; padding-left: 40px; font-size: 16px; line-height: 1.45; font-style: italic; color: rgb(var(--ink-2)); }
.zp-notes b { position: absolute; left: 0; top: -4px; display: grid; place-items: center; width: 28px; height: 28px; border: 2.5px solid rgb(var(--gold)); border-radius: 52% 46% 55% 44%; font: 900 14px/1 var(--font-display), sans-serif; font-style: normal; color: rgb(var(--gold-text)); }
</style>
