<script setup lang="ts">
// "Run your own streamer awards for your community", printed: three clippings
// pasted on the page, each showing the thing it describes. Same three points as
// sections/FeatureGrid.vue - any nominee, one vote each, share cards.
import ZinePen from './ZinePen.vue'
import PlatformDot from '~/components/ui/PlatformDot.vue'

const channels = [
  { name: 'ishowspeed', meta: 'YouTube · 41.2M', platform: 'youtube' as const },
  { name: 'dzvin_tv', meta: 'Kick · 88K', platform: 'kick' as const },
  { name: 'maryana', meta: 'YouTube · 402K', platform: 'youtube' as const },
]
</script>

<template>
  <section class="zf">
    <div class="shell">
      <h2 class="zf-h zine-display">Run your own streamer awards for your community</h2>
      <p class="zf-intro">You bring the categories and the community. Everything else is here.</p>

      <div class="zf-grid">
        <article class="zf-clip">
          <h3>Nominate any channel, or type in anything</h3>
          <p>Every channel we track, or plain text when the nominee is a mod, a clip or a running joke.</p>
          <div class="zf-art" aria-hidden="true">
            <p class="zf-fill"><span>Nominee</span><i>stint</i></p>
            <ul class="zf-list">
              <li v-for="c in channels" :key="c.name"><PlatformDot :platform="c.platform" :label="false" :size="14" /><b>{{ c.name }}</b><span>{{ c.meta }}</span></li>
            </ul>
            <p class="zf-add">+ Add "the 3am raid" as text</p>
          </div>
        </article>

        <article class="zf-clip">
          <h3>One account, one vote per category</h3>
          <p>Always on, never a setting you can turn off.</p>
          <div class="zf-art" aria-hidden="true">
            <div class="zf-slip">
              <p v-for="n in ['Best moment', 'Mod MVP', 'Best emote']" :key="n"><span class="zf-box" />{{ n }}<em class="tnum">1 / 1</em></p>
            </div>
            <div class="zf-slip zf-void">
              <p><span class="zf-box" />Best moment<em class="tnum">2 / 1</em></p>
              <span class="zf-stamp">Refused</span>
            </div>
            <p class="zf-cap">A second vote from the same account is refused.</p>
          </div>
        </article>

        <article class="zf-clip">
          <h3>Share nominees and winners with your community</h3>
          <p>Every awards page carries its own preview image, so a link in chat or on X shows the show, not a bare URL.</p>
          <div class="zf-art zf-flyers" aria-hidden="true">
            <div class="zf-fly">
              <span class="zf-claim">Nominated</span>
              <b>maryana</b>
              <small>Best moment of the year</small>
            </div>
            <div class="zf-fly">
              <span class="zf-claim">Winner</span>
              <b><ZinePen>ishowspeed</ZinePen></b>
              <small class="tnum">612 of 1 284 votes</small>
            </div>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.zf { padding: 72px 0; border-top: 2px solid rgb(var(--ink)); }
.zf-h { max-width: 16ch; font-size: clamp(40px, 6vw, 72px); line-height: 0.88; text-transform: uppercase; color: rgb(var(--gold)); text-wrap: balance; }
.zf-intro { margin-top: 18px; max-width: 58ch; font-size: 19px; line-height: 1.55; color: rgb(var(--ink-2)); }
.zf-grid { display: grid; gap: 22px; margin-top: 44px; align-items: start; }
@media (min-width: 1024px) { .zf-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } .zf-clip:nth-child(1) { transform: rotate(-1deg); } .zf-clip:nth-child(3) { transform: rotate(0.8deg); } }
.zf-clip { padding: 20px 20px 22px; border: 2.5px solid rgb(var(--ink)); background: rgb(var(--canvas)); }
.zf-clip h3 { font: 900 21px/1.05 var(--font-display), sans-serif; font-stretch: 120%; text-transform: uppercase; }
.zf-clip > p { margin-top: 8px; font-size: 15px; line-height: 1.5; color: rgb(var(--ink-2)); }
.zf-art { margin-top: 18px; padding-top: 16px; border-top: 2px dashed rgb(var(--ink)); }
.zf-fill { display: flex; align-items: flex-end; gap: 10px; font-size: 13px; font-weight: 600; }
.zf-fill i { flex: 1; border-bottom: 2px solid rgb(var(--ink)); font: 700 17px/1.3 var(--font-body), sans-serif; font-style: normal; color: rgb(var(--gold-text)); }
.zf-list { margin: 10px 0 0; padding: 0; list-style: none; }
.zf-list li { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1.5px dashed rgb(var(--hair)); font-size: 14px; }
.zf-list span { margin-left: auto; color: rgb(var(--ink-2)); font-size: 13px; }
.zf-add { margin-top: 10px; padding: 8px 10px; border: 2px dashed rgb(var(--ink)); font-size: 14px; color: rgb(var(--ink-2)); }
.zf-slip { position: relative; padding: 4px 12px; border: 2px solid rgb(var(--ink)); }
.zf-slip p { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1.5px dashed rgb(var(--hair)); font: 800 16px/1 var(--font-display), sans-serif; font-stretch: 112%; }
.zf-slip p:last-child { border-bottom: 0; }
.zf-slip em { margin-left: auto; font: 600 12px/1 var(--font-body), sans-serif; font-style: normal; color: rgb(var(--ink-2)); }
.zf-box { width: 16px; height: 16px; flex: none; background: rgb(var(--ink)); }
.zf-void { margin-top: 10px; opacity: 0.85; }
.zf-void p { text-decoration: line-through; text-decoration-thickness: 2px; }
.zf-stamp { position: absolute; right: 10px; top: 50%; padding: 4px 8px 3px; border: 3px double rgb(var(--ink)); background: rgb(var(--canvas)); font: 800 12px/1 var(--font-display), sans-serif; font-stretch: 118%; letter-spacing: 0.06em; text-transform: uppercase; transform: translateY(-50%) rotate(-6deg); }
.zf-cap { margin-top: 10px; font-size: 13px; color: rgb(var(--ink-2)); }
.zf-flyers { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.zf-fly { display: grid; align-content: start; gap: 8px; padding: 12px; border: 2px solid rgb(var(--ink)); }
.zf-claim { font: 900 15px/1 var(--font-display), sans-serif; font-stretch: 125%; text-transform: uppercase; color: rgb(var(--gold)); }
.zf-fly b { margin-top: 4px; font: 900 17px/1.1 var(--font-display), sans-serif; font-stretch: 100%; }
.zf-fly small { font-size: 12px; color: rgb(var(--ink-2)); }
</style>
