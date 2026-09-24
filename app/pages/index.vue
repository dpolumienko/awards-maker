<script setup lang="ts">
import HeroSection from '~/components/sections/HeroSection.vue'
import AwardPagePreview from '~/components/sections/AwardPagePreview.vue'
import StepsSection from '~/components/sections/StepsSection.vue'
import VotingTypes from '~/components/sections/VotingTypes.vue'
import FeatureGrid from '~/components/sections/FeatureGrid.vue'
import CtaBand from '~/components/sections/CtaBand.vue'
import CategoryIdeas from '~/components/sections/CategoryIdeas.vue'
import PlansSection from '~/components/sections/PlansSection.vue'
import CatalogSection from '~/components/sections/CatalogSection.vue'
import FaqSection, { type FaqItem } from '~/components/sections/FaqSection.vue'

// Copy is frozen in outputs/awards-landing-copy-2026-09-13.md - change it there first.
const faq: FaqItem[] = [
  { q: 'How do I host my own streamer awards for my Twitch chat?', a: 'Log in with Twitch, add up to 5 nominations and fill each one with channels or text nominees, publish, and paste the page link in chat.' },
  { q: 'Is the awards maker free?', a: 'It\u2019s free. One awards can be active at a time, with up to 5 nominations in it.' },
  { q: 'Who can vote, and how are fake votes stopped?', a: 'In an open viewer vote, anyone can vote after signing in with Twitch. Each account gets exactly one vote per category, and that limit is always on.' },
  { q: 'What are good categories for end of year awards?', a: 'Mix one or two big ones, like Clip of the Year or Chatter of the Year, with something only your community gets, like Rage Quit of the Year. The 30 ideas above are a good place to start.' },
  { q: 'Can I nominate Kick or YouTube streamers, or only Twitch channels?', a: 'Any channel in the Streams Charts database can be a nominee, and it covers Twitch, YouTube, Kick and more. A nominee doesn\u2019t even have to be a channel: type in a name, a clip title or a meme as text.' },
  { q: 'How many nominations can one awards have?', a: 'Up to 5. If chat gives you more ideas than that, keep the ones they\u2019ll argue about hardest.' },
  { q: 'Does my awards get its own page?', a: 'Yes. Every published awards gets its own public page on Streams Charts, with a link you can paste in chat and a preview card for X and Discord.' },
  { q: 'Can I reveal the winners live on stream?', a: 'Yes, on your own stream. Close voting, announce each winner live, then publish the results so anyone who missed the broadcast finds the same list on the awards page.' },
  { q: 'Is Awards Maker part of The Streamer Awards?', a: 'No. Awards Maker lets any streamer run awards for their own community on Streams Charts. News, nominees and winners of The Streamer Awards live on our awards events page.' },
]

useSeoMeta({
  title: 'Awards Maker: Twitch Awards for Your Chat',
  description:
    'Run your own streamer awards: pick categories, nominate any channel, let chat vote or choose winners yourself. Free with a Twitch login.',
  ogImage: ogCard('home'),
})


useSchemaOrg([
  defineWebPage({ name: 'Awards Maker for Streamers: Run Your Own Awards Show' }),
  ...faq.map((f) => defineQuestion({ name: f.q, acceptedAnswer: f.a })),
])
</script>

<template>
  <!-- Order follows the intent sequence in outputs/awards-landing-seo-brief-2026-09-13.md
       (3.2), re-cut 2026-09-16: show the thing, explain it, price it, ask for the
       click, answer the objections, then let people browse.
       Price sits right after the features, where a reader who is sold asks "what
       does it cost" - at the bottom it read as an afterthought. The CTA band
       follows the price, because that is the moment to act on it. Ideas stay
       above the money: "what would I even run" is the question in the way.
       The catalog sits low but not last: it is discovery and every card in it
       leads off this page, so it goes after the ask - and the FAQ closes the
       page, which is where a reader expects to find the remaining objections. -->
  <HeroSection />
  <AwardPagePreview />
  <StepsSection />
  <VotingTypes />
  <FeatureGrid />
  <CategoryIdeas />
  <PlansSection />
  <CtaBand />
  <CatalogSection />
  <FaqSection :items="faq" />
</template>
