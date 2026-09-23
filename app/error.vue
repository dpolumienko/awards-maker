<script setup lang="ts">
// Links to this site live in chat messages, stream titles and pasted DMs, so a
// wrong one is routine. Nuxt's built-in error page is a white screen with a
// stack trace under it; this is the same site, with the two ways out.
import UiButton from '~/components/ui/UiButton.vue'
import SiteHeader from '~/components/SiteHeader.vue'
import SiteFooter from '~/components/SiteFooter.vue'
import type { NuxtError } from '#app'

const { error } = defineProps<{ error: NuxtError }>()
const notFound = error.statusCode === 404

useSeoMeta({
  title: notFound ? 'Page not found' : 'Something went wrong',
  robots: 'noindex, follow',
})
</script>

<template>
  <div id="top">
    <SiteHeader />
    <main id="main" class="shell py-20 text-center">
      <p class="micro text-gold-text">{{ error.statusCode }}</p>
      <h1 class="heading mt-3">{{ notFound ? 'That page is not here' : 'Something went wrong' }}</h1>
      <p class="mx-auto mt-4 max-w-copy text-lg text-ink-2">
        <template v-if="notFound">
          The address may be mistyped, or the awards it pointed at was never published. Every published
          show is in the catalog.
        </template>
        <template v-else>
          The page failed to load. Trying again usually works; if it does not, the catalog and the
          builder are both still up.
        </template>
      </p>
      <div class="mt-8 flex flex-wrap justify-center gap-3">
        <UiButton to="/catalog">Browse the catalog</UiButton>
        <UiButton to="/create" variant="ghost">Create your awards</UiButton>
        <UiButton to="/" variant="ghost">Back to the start</UiButton>
      </div>
    </main>
    <SiteFooter />
  </div>
</template>
