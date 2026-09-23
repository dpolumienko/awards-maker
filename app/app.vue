<script setup lang="ts">
import { computed } from 'vue'
import GlowFilterDefs from '~/components/ui/GlowFilterDefs.vue'

// A page can ask for the shell to step aside - `definePageMeta({ chrome: false })`.
// The ceremony screen is captured by OBS, and a site header in the shot is a site
// header on stream.
const route = useRoute()
const chrome = computed(() => route.meta.chrome !== false)
// @nuxtjs/seo appends site.name by default; the approved title carries the brand
// suffix "Streams Charts" instead, so the template is set explicitly here.
useHead({ titleTemplate: (t?: string) => (t ? `${t} | Streams Charts` : 'Awards Maker | Streams Charts') })
</script>

<template>
  <div id="top">
    <GlowFilterDefs />
    <a
      v-if="chrome"
      href="#main"
      class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-btn focus:bg-gold focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-canvas"
    >Skip to content</a>
    <SiteHeader v-if="chrome" />
    <main id="main">
      <NuxtPage />
    </main>
    <SiteFooter v-if="chrome" />
  </div>
</template>
