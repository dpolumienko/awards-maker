<script setup lang="ts">
// The closing ask on the Fanzine landing: a coupon to cut out. Same words as
// sections/CtaBand.vue; "favorites" gets the blue marker, the pink pen stays for
// what was actually chosen.
import UiButton from '~/components/ui/UiButton.vue'

const SCISSORS = 'M6 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM6 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM20 4L8.1 15.9M14.5 14.5L20 20M8.1 8.1L12 12'
</script>

<template>
  <section class="zc">
    <div class="shell">
      <div class="zc-coupon">
        <span class="zc-cut" aria-hidden="true"><svg viewBox="0 0 24 24"><path :d="SCISSORS" /></svg>Cut here</span>
        <h2 class="zc-h zine-display">Your viewers already have <span class="zc-mark">favorites</span></h2>
        <p class="zc-p">Give them a ballot. Setup takes a few minutes, and the free plan covers a first season.</p>
        <UiButton to="/create">Create your awards</UiButton>
      </div>
    </div>
  </section>
</template>

<style scoped>
.zc { padding: 72px 0; border-top: 2px solid rgb(var(--ink)); }
.zc-coupon { position: relative; display: grid; justify-items: center; gap: 22px; padding: 56px 24px 52px; border: 3px dashed rgb(var(--ink)); text-align: center; }
.zc-cut { position: absolute; top: -13px; left: 28px; display: flex; align-items: center; gap: 6px; padding: 0 8px; background: rgb(var(--canvas)); font: 800 12px/1 var(--font-display), sans-serif; font-stretch: 115%; letter-spacing: 0.06em; text-transform: uppercase; }
.zc-cut svg { width: 18px; height: 18px; fill: none; stroke: rgb(var(--ink)); stroke-width: 2; stroke-linecap: round; }
.zc-h { max-width: 16ch; font-size: clamp(36px, 5.5vw, 68px); line-height: 0.9; text-transform: uppercase; color: rgb(var(--ink)); text-wrap: balance; }
/* the marker pass, as a static highlight behind one word */
.zc-mark { position: relative; z-index: 0; color: rgb(var(--gold)); white-space: nowrap; }
.zc-mark::before { content: ''; position: absolute; z-index: -1; inset: 55% -0.12em 0; background: rgb(var(--gold) / 0.22); -webkit-mask: var(--brush) center / 100% 100% no-repeat; mask: var(--brush) center / 100% 100% no-repeat; }
.zc-p { max-width: 46ch; font-size: 19px; line-height: 1.55; color: rgb(var(--ink-2)); }
</style>
