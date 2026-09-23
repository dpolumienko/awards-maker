<script setup lang="ts">
// Port of the illuminated text treatment from "Illuminated Hero" on 21st.dev.
// Source: https://21st.dev/@efferd/components/illuminated-hero
// The lit copy sits in ::before (gradient-clipped) and fades up over the base
// text, which carries the multi-layer glow filter. Filter defs: GlowFilterDefs.vue.
const { text } = defineProps<{ text: string }>()
</script>

<template>
  <span class="glow relative inline-block" :data-text="text">{{ text }}</span>
</template>

<style scoped>
.glow {
  filter: url(#glow-gold);
  white-space: nowrap;
}
.glow::before {
  content: attr(data-text);
  position: absolute;
  inset: 0;
  background: linear-gradient(0deg, #d9a441 0%, #fff3d8 55%);
  -webkit-background-clip: text;
  background-clip: text;
  color: #fff3d8;
  opacity: 0;
  animation: glow-in 1.4s ease-out 0.5s forwards;
}
@keyframes glow-in {
  to { opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .glow::before { animation: none; opacity: 1; }
}
</style>
