<script setup lang="ts">
// Category ideas, all of them. This is a search page first: "end of year awards",
// "award categories", "funny award categories" have steady demand and easy
// difficulty, and the landing only had room for a drifting sample of 30.
//
// It stays server-rendered - nothing here depends on localStorage, and a page
// written for search cannot be behind JavaScript.
import { ref } from 'vue'
import UiButton from '~/components/ui/UiButton.vue'
import ClosingCta from '~/components/ui/ClosingCta.vue'
import InteractiveAccordion from '~/components/ui/InteractiveAccordion.vue'
import { useReveal } from '~/composables/useReveal'
import { useCatalogOpen } from '~/composables/useAwards'

const catalogOpen = useCatalogOpen()
import { IDEA_GROUPS, IDEA_TOTAL } from '~/data/ideas'
import '~/assets/css/envelope-pages.css'

const root = ref<HTMLElement | null>(null)
useReveal(root, { stagger: 0.04 })

const faq = [
  {
    q: 'How many categories should an awards show have?',
    a: `Five is a good target, and it is what the free plan covers. A ballot people finish beats a longer one they abandon halfway, and your dashboard shows exactly where they stop: it counts how many ballots reached each category.`,
  },
  {
    q: 'What makes a category people actually vote in?',
    a: 'It has to have obvious candidates. "Best Moment" makes everyone think for a minute and then close the tab; "Rage Quit of the Year" already has three names attached to it in your chat. Write the category the way your community would say it.',
  },
  {
    q: 'Should the funny categories go first or last?',
    a: 'Mixed in. One funny category after every two serious ones keeps a ballot moving, and the funny ones are what gets screenshotted when the winners are out.',
  },
  {
    q: 'Can I use these for a Discord server or a game community?',
    a: 'Yes. Nominees do not have to be channels - type in any name, or use a clip or an image on the paid tier. The chat group works for a server as well as for a stream.',
  },
]

useSeoMeta({
  title: `${IDEA_TOTAL} Award Category Ideas for Streamers`,
  description: `${IDEA_TOTAL} award category ideas for a streamer awards show: community awards, clips and collabs, funny ones and the classics. Open any group as a draft and run it free.`,
  ogImage: ogCard('ideas'),
})


useSchemaOrg([
  defineWebPage({ '@type': ['WebPage', 'FAQPage'], name: 'Award Category Ideas for Streamers' }),
  defineBreadcrumb({
    itemListElement: [{ name: 'Streams Charts', item: 'https://streamscharts.com' }, { name: 'Awards Maker', item: '/' }, { name: 'Category ideas' }],
  }),
  ...faq.map((f) => defineQuestion({ name: f.q, acceptedAnswer: f.a })),
  defineItemList({
    name: 'Award category ideas',
    itemListElement: IDEA_GROUPS.flatMap((g) => g.items).map((name, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name,
    })),
  }),
])
</script>

<template>
  <!-- drawn like the other plain pages (Your awards, Payments): crumbs, a title with
       a sub line, flat panels; the ideas as the landing's chips, no emoji (Ed, 2026-10-22) -->
  <div ref="root" class="shell env-pg ideas">
    <nav class="pg-crumbs" aria-label="Breadcrumb">
      <NuxtLink to="/">Awards Maker</NuxtLink><span aria-hidden="true">/</span><span aria-current="page">Category ideas</span>
    </nav>
    <div class="pg-head">
      <div>
        <h1>Award category ideas for streamers</h1>
        <p class="pg-sub">
          {{ IDEA_TOTAL }} categories for a streamer awards show, in four groups. Open a group as a draft,
          keep the ones that fit your channel, rename the rest.
        </p>
      </div>
      <div class="db-acts">
        <UiButton v-if="catalogOpen" to="/catalog" variant="ghost">See shows running now</UiButton>
        <UiButton to="/create">Create your awards</UiButton>
      </div>
    </div>

    <!-- A group is a starting draft, not a product: all of them open free, and
         the builder is where a show past the free ceiling finds out (review
         2026-09-24 - "paid labels here scare people off"). -->
    <section v-for="g in IDEA_GROUPS" :id="g.id" :key="g.id" class="id-group js-reveal" :aria-labelledby="`${g.id}-h`">
      <!-- the name big on the left, the ideas on the right (Ed, 2026-10-22: one wide row was too stretched) -->
      <div class="id-head">
        <h2 :id="`${g.id}-h`">{{ g.title }}</h2>
        <p>{{ g.blurb }}</p>
        <p class="id-n tnum">{{ g.items.length }} ideas</p>
        <UiButton :to="`/create?ideas=${g.id}`" variant="ghost" size="sm">Use this pack</UiButton>
      </div>
      <ul class="id-chips">
        <li v-for="item in g.items" :key="item">{{ item }}</li>
      </ul>
    </section>

    <!-- the same block as the FAQ on /create and /plans -->
    <section class="mt-16 border-t border-hair pt-12">
      <h2 class="heading">Picking the ones that work</h2>
      <div class="mt-6 border-t border-hair">
        <InteractiveAccordion :items="faq" />
      </div>
    </section>

    <ClosingCta title="Take five and run the show">
      Start from a draft, nominate any channel, and your viewers vote on a page of its own. Free with a Twitch or Kick login.
      <template #actions>
        <UiButton to="/create">Create your awards</UiButton>
        <UiButton to="/" variant="ghost">How it works</UiButton>
      </template>
    </ClosingCta>
  </div>
</template>
