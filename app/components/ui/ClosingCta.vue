<script setup lang="ts">
// The last ask on a content page (/ideas, /plans): a title, a line, the actions.
// Drawn like the landing's closing call (Ed, 2026-10-22): one flat panel, centred,
// the title in Gloock, the line under it, then the buttons.

defineProps<{ title: string }>()
</script>

<template>
  <section class="ccta">
    <h2>{{ title }}</h2>
    <p><slot /></p>
    <div class="ccta-b"><slot name="actions" /></div>
  </section>
</template>

<style scoped>
.ccta { margin-top: clamp(56px, 7vw, 96px); padding: clamp(48px, 6vw, 80px) 24px; border-radius: 12px; background: radial-gradient(60% 90% at 50% 0%, rgba(201, 164, 92, 0.14), transparent 70%), var(--e-white, #141413); display: grid; justify-items: center; gap: 16px; text-align: center; }
.ccta h2 { margin: 0; font: 400 clamp(36px, 4.6vw, 64px)/1 var(--e-serif, Georgia, serif); letter-spacing: -0.03em; max-width: 18ch; }
.ccta p { margin: 0; max-width: 52ch; font-size: 17px; color: var(--e-ink-2, #c2bdb2); }
.ccta-b { margin-top: 8px; display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; }
</style>
