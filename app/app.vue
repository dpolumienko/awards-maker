<script setup lang="ts">
import { computed } from 'vue'
import GlowFilterDefs from '~/components/ui/GlowFilterDefs.vue'
import PublishCurtain from '~/components/ui/PublishCurtain.vue'
import { usePublishCurtain } from '~/composables/usePublishCurtain'
import { DESIGN_BOOT } from '~/data/design'

// A page can ask for the shell to step aside - `definePageMeta({ chrome: false })`.
// The ceremony screen is captured by OBS, and a site header in the shot is a site
// header on stream.
const route = useRoute()
// The publish moment is mounted here, not on the builder, so the wipe can finish
// over the page it produced instead of over the form that made it.
const curtain = usePublishCurtain()
const chrome = computed(() => route.meta.chrome !== false)
// @nuxtjs/seo appends site.name by default; the approved title carries the brand
// suffix "Streams Charts" instead, so the template is set explicitly here.
useHead({ titleTemplate: (t?: string) => (t ? `${t} | Streams Charts` : 'Awards Maker | Streams Charts') })

// The landing, a published awards page and the ceremony are the show: true black.
// The builder and the host's pages are a tool, and a tool that a person works in
// for an hour needs its panels to come off the background.
const stage = computed(
  () => route.path === '/' || route.path.startsWith('/a/') || route.meta.chrome === false,
)
useHead({ bodyAttrs: { 'data-stage': () => (stage.value ? '1' : '0') } })
// the design switcher's choice, applied before first paint (data/design.ts)
useHead({ script: [{ innerHTML: DESIGN_BOOT, tagPriority: 'critical' }] })
</script>

<template>
  <div id="top">
    <GlowFilterDefs />
    <a
      v-if="chrome"
      href="#main"
      class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-btn focus:bg-gold focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-on-gold"
    >Skip to content</a>
    <!-- the room's light. Not on the ceremony screen: that one is its own stage,
         and in OBS mode the background has to stay exactly what the host chose. -->
    <div v-if="chrome" aria-hidden="true" class="rig pointer-events-none fixed inset-0 -z-10" />
    <!-- temporary: palette and button comparison, review 2026-09-24 -->
    <DesignSwitcher v-if="chrome" />
    <SiteHeader v-if="chrome" />
    <main id="main">
      <NuxtPage />
    </main>
    <SiteFooter v-if="chrome" />
    <PublishCurtain
      :open="!!curtain.show.value"
      :name="curtain.show.value?.name ?? ''"
      :url="curtain.show.value?.url ?? ''"
      :look="curtain.show.value?.look"
      @reveal="curtain.show.value && navigateTo(`/a/${curtain.show.value.slug}`)"
      @done="curtain.close()"
    />
  </div>
</template>
