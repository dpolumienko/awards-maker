<script setup lang="ts">
// Shell for the legal pages: breadcrumb, title, the date it was last touched and
// a column of prose. Both documents are narrow-measure text, so the typography
// lives here once instead of in every page.
import UiButton from './UiButton.vue'

const { title, updated, intro } = defineProps<{
  title: string
  /** Shown as "Last updated" - a legal page without a date is not a legal page. */
  updated: string
  intro: string
}>()
</script>

<template>
  <div class="shell py-10">
    <nav aria-label="Breadcrumb" class="mb-6">
      <ol class="flex list-none flex-wrap items-center gap-2 p-0 text-[11px] font-semibold uppercase tracking-micro text-ink-muted">
        <li><NuxtLink to="/" class="inline-block py-1.5 no-underline hover:text-ink">Awards Maker</NuxtLink></li>
        <li aria-hidden="true">/</li>
        <li class="text-ink-2" aria-current="page">{{ title }}</li>
      </ol>
    </nav>

    <h1 class="heading max-w-[22ch]">{{ title }}</h1>
    <p class="mt-4 max-w-copy text-lg text-ink-2">{{ intro }}</p>
    <p class="mt-3 text-sm text-ink-muted">Last updated {{ updated }}</p>

    <div class="legal mt-10 max-w-copy">
      <slot />
    </div>

    <div class="mt-12 flex flex-wrap gap-3 border-t border-hair pt-8">
      <UiButton to="/">Back to Awards Maker</UiButton>
      <UiButton to="/catalog" variant="ghost">Browse the catalog</UiButton>
    </div>
  </div>
</template>

<style scoped>
.legal :deep(h2) {
  @apply mt-10 text-xl font-bold;
}
.legal :deep(h2:first-child) {
  @apply mt-0;
}
.legal :deep(p) {
  @apply mt-4 text-ink-2;
}
.legal :deep(ul) {
  @apply mt-4 list-none space-y-2 p-0 text-ink-2;
}
.legal :deep(li) {
  @apply relative pl-5;
}
.legal :deep(li)::before {
  content: '';
  @apply absolute left-0 top-[0.62em] h-1 w-1 rounded-pill bg-gold;
}
.legal :deep(a) {
  @apply text-gold-text underline underline-offset-4;
}
.legal :deep(strong) {
  @apply font-semibold text-ink;
}
</style>
