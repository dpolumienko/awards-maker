<script setup lang="ts">
// Terms for Awards Maker. Same principle as the privacy page: the Streams Charts
// terms of use govern, and this document covers the part they do not - who owns
// a show, what may go on a ballot, how a vote is counted and when we take a page
// down. Entity, governing law and the contact route come from
// streamscharts.com/terms.
//
// DRAFT: assembled from our own published terms, not by a lawyer. Needs a legal
// read before launch; the page says so.
import LegalPage from '~/components/ui/LegalPage.vue'
import { FREE, PUBLISH } from '~/types/award'

const SC_TERMS = 'https://streamscharts.com/terms'
const SC_PRIVACY = 'https://streamscharts.com/privacy'

useSeoMeta({
  title: 'Terms: Running and Voting in Awards',
  description:
    'The rules of Awards Maker: who owns a show, what can go on a ballot, one ballot per Twitch account, when a page comes down, and what the paid tier is.',
  ogImage: ogCard('home'),
})

useSchemaOrg([
  defineWebPage({ name: 'Terms' }),
  defineBreadcrumb({ itemListElement: [{ name: 'Awards Maker', item: '/' }, { name: 'Terms' }] }),
])
</script>

<template>
  <LegalPage
    title="Terms"
    updated="23 September 2026"
    intro="Awards Maker is part of Streams Charts, operated by STREAMS CHARTS Public Organization. The Streams Charts terms of use apply here in full; these terms cover what is specific to running an awards show and voting in one."
  >
    <p class="rounded-card border border-warn/40 bg-warn/[0.07] p-4 text-sm !text-warn">
      <strong class="!text-warn">Draft for legal review.</strong> The rules below are the ones the product actually enforces.
    </p>

    <h2>What this service is</h2>
    <p>
      Awards Maker lets a streamer build an awards show, publish it as a public page, and let viewers vote
      on it. We host the page, count the votes and keep the results online afterwards. We do not organise
      the show, choose the categories or pick the nominees - the host does.
    </p>

    <h2>Your show is yours</h2>
    <p>
      The name, description, categories and nominees you enter stay your content. By publishing you give
      Streams Charts a non-exclusive licence to host, display, index and share that content for as long as
      the page exists, including in the public catalog and in previews when the link is shared.
    </p>

    <h2>What may go on a ballot</h2>
    <p>A nominee can be a channel we track, plain text, or - on the paid tier - an image or a clip. What it cannot be:</p>
    <ul>
      <li>harassment of a person or a channel, including a category written to humiliate somebody;</li>
      <li>hate speech, threats, or content sexualising a minor;</li>
      <li>impersonation of another person, channel, brand or awards show;</li>
      <li>content you have no right to publish, including someone else's clip or image passed off as material you may use;</li>
      <li>anything unlawful under Ukrainian law or the law where you or your viewers are.</li>
    </ul>
    <p>
      Anyone can flag a page with the Report button on it. We can unlist a page from the catalog, unpublish
      it, or remove it entirely when it breaks these rules - and we may do it without notice when the
      content is clearly illegal. Write to
      <a href="mailto:team@streamscharts.com">team@streamscharts.com</a> to appeal a decision.
    </p>

    <h2>How voting works</h2>
    <ul>
      <li>One Twitch account casts one ballot per show, and one nominee per category.</li>
      <li>A ballot cannot be changed after it is submitted.</li>
      <li>Counts stay hidden from everyone but the host until the host publishes the winners.</li>
      <li>
        On the free plan a show runs to {{ FREE.maxNominations }} categories and {{ FREE.maxVoters }}
        voters. Voting stops there; the votes already cast are kept.
      </li>
      <li>
        We may discard votes that come from automated traffic or from accounts created to stuff a ballot,
        and we may stop a vote that is clearly being manipulated.
      </li>
    </ul>
    <p>
      The host decides when the winners are announced. Where the result is a tie, the host picks - the
      product does not break ties for them.
    </p>

    <h2>Appearing in search and in the catalog</h2>
    <p>
      Every published show is listed in the public catalog; there is no way to publish a hidden one today.
      A page is opened to search engines once it has at least {{ PUBLISH.minNominations }} categories,
      {{ PUBLISH.minNomineesPerNomination }} nominees in each and a description. Below that it stays
      reachable by link but is not indexed.
    </p>

    <h2>Paying</h2>
    <p>
      The paid tier is a one-off purchase for one show - not a subscription - and it is not on sale yet.
      When it ships, payment, chargebacks and refunds follow the
      <a :href="SC_TERMS" rel="noopener">Streams Charts terms of use</a>. Everything built on the free plan
      carries over. For a show we run with you, write to
      <a href="mailto:sales@streamscharts.com">sales@streamscharts.com</a>.
    </p>

    <h2>What we do not promise</h2>
    <p>
      The service is provided as is. We do not guarantee that a page is reachable without interruption, that
      every vote comes from a real person despite the checks above, or that the results of a public vote say
      anything beyond what people clicked. We are not liable for indirect or consequential losses arising
      from a show you ran.
    </p>

    <h2>Age</h2>
    <p>
      In line with the Streams Charts terms, the service is not intended for users under 18. The
      <NuxtLink to="/privacy">privacy notice</NuxtLink> explains what happens if a child's data reaches us.
    </p>

    <h2>Changes and governing law</h2>
    <p>
      We can change these terms; the date at the top says when they last moved, and continuing to use the
      service after a change means accepting it. Ukrainian law governs, as in the
      <a :href="SC_TERMS" rel="noopener">main terms</a>. Data handling is described in the
      <NuxtLink to="/privacy">Awards Maker privacy notice</NuxtLink> and the
      <a :href="SC_PRIVACY" rel="noopener">Streams Charts privacy policy</a>.
    </p>

    <h2>Contact</h2>
    <p>
      STREAMS CHARTS Public Organization, Ukraine, 01104, Kyiv, Lesi Ukrainki 29, ap. 53.
      Support and reports: <a href="mailto:team@streamscharts.com">team@streamscharts.com</a>.
      Sales: <a href="mailto:sales@streamscharts.com">sales@streamscharts.com</a>.
    </p>
  </LegalPage>
</template>
