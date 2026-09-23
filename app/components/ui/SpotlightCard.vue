<script setup lang="ts">
// Was a port of "Feature Grid Spotlight Cards" (feature-08) on 21st.dev
// (MIT, Mohammad Shehadeh). Two things have been removed since:
//   2026-09-14 review - the bleeding -inset-4 hairlines and corner crosshairs.
//   2026-09-16 audit - the gold radial spotlight and the warm top wash. Eight
//   gold radial glows on one page is the generated-UI signature, so the page now
//   keeps one, in the hero. What is left of the original here is the layout.
</script>

<template>
  <div
    class="group relative flex h-full flex-col justify-start gap-6 rounded-card border border-hair bg-s1 px-6 pb-6 pt-8 transition-colors duration-300 hover:border-gold-24"
  >
    <div v-if="$slots.mark" class="relative z-10 flex w-fit items-center justify-center rounded-btn border border-hair bg-s2/50 p-3 transition-colors duration-300 group-hover:border-gold/40">
      <slot name="mark" />
    </div>
    <div class="relative z-10 flex flex-col gap-2"><slot /></div>
  </div>
</template>
