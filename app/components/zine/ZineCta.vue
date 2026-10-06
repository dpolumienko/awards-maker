<script setup lang="ts">
// The closing ask on the Fanzine landing: an admission ticket to your own show. Same words as
// sections/CtaBand.vue; "favorites" is printed in the press blue, the pink pen
// stays for what was actually chosen.
import UiButton from '~/components/ui/UiButton.vue'

</script>

<template>
  <section class="zc">
    <div class="shell">
      <div class="zc-coupon zine-ticket">
        <span class="zine-ticket-tag" aria-hidden="true">Admit one · your awards night</span>
        <h2 class="zc-h zine-display">Your viewers already have <span class="zc-mark">favorites</span></h2>
        <p class="zc-p">Give them a ballot. Setup takes a few minutes, and the free plan covers a first season.</p>
        <UiButton to="/create">Create your awards</UiButton>
      </div>
    </div>
  </section>
</template>

<style scoped>
.zc { padding: 72px 0; border-top: 2px solid rgb(var(--ink)); }
.zc-coupon { position: relative; display: grid; justify-items: center; gap: 22px; padding: 56px 24px 52px; text-align: center; }
.zc-h { max-width: 16ch; font-size: clamp(36px, 5.5vw, 68px); line-height: 0.9; text-transform: uppercase; color: rgb(var(--ink)); text-wrap: balance; }
.zc-mark { color: rgb(var(--gold)); white-space: nowrap; }
.zc-p { max-width: 46ch; font-size: 19px; line-height: 1.55; color: rgb(var(--ink-2)); }
</style>
