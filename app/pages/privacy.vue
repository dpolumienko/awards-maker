<script setup lang="ts">
// Privacy notice for Awards Maker.
//
// It does not restate the Streams Charts policy - it names what this product
// adds on top of it: a Twitch sign-in used only to keep one ballot per account,
// ballots, and the awards content a host types in. Entity, address, retention
// windows and the rights procedure are taken from streamscharts.com/privacy, so
// the two documents cannot drift apart on the facts.
//
// DRAFT: written from our own published policies, not by a lawyer. It needs a
// legal read before launch - the line under the title says so on the page too.
import LegalPage from '~/components/ui/LegalPage.vue'
import { FREE, PUBLISH } from '~/types/award'

const SC_PRIVACY = 'https://streamscharts.com/privacy'
const SC_TERMS = 'https://streamscharts.com/terms'
const SC_COOKIES = 'https://streamscharts.com/cookie-policy'

useSeoMeta({
  title: 'Privacy: What Awards Maker Does With Your Data',
  description:
    'What Awards Maker collects when you vote or run an awards show: a Twitch sign-in used only to keep one ballot per account, the ballot itself, and the show you build. Your rights and how to use them.',
  ogImage: ogCard('home'),
})

useSchemaOrg([
  defineWebPage({ name: 'Privacy notice' }),
  defineBreadcrumb({ itemListElement: [{ name: 'Awards Maker', item: '/' }, { name: 'Privacy' }] }),
])
</script>

<template>
  <LegalPage
    title="Privacy"
    updated="23 September 2026"
    intro="Awards Maker is part of Streams Charts. The Streams Charts privacy policy applies here in full; this page says what this product adds to it - what happens when you vote, and what happens when you run a show."
  >
    <p class="rounded-card border border-warn/40 bg-warn/[0.07] p-4 text-sm !text-warn">
      <strong class="!text-warn">Draft for legal review.</strong> The facts below describe how the product works today.
    </p>

    <h2>Who processes your data</h2>
    <p>
      <strong>STREAMS CHARTS Public Organization</strong>, Ukraine, 01104, Kyiv, Lesi Ukrainki 29, ap. 53,
      is the controller. The full policy, including the California notice, international transfers and the
      list of processor categories, is at
      <a :href="SC_PRIVACY" rel="noopener">streamscharts.com/privacy</a>. Cookies are covered by the
      <a :href="SC_COOKIES" rel="noopener">cookie policy</a>.
    </p>

    <h2>If you vote in someone's awards</h2>
    <p>
      You sign in with Twitch at the moment you submit a ballot, not before. From that sign-in we read your
      Twitch account identifier and the email on it, and we use them for one purpose: keeping one ballot per
      account. We store the ballot itself - which nominee you picked in each category - and the time it was
      submitted.
    </p>
    <ul>
      <li>
        <strong>The host never sees who voted for whom.</strong> They see totals per nominee, the number of
        voters, and how many ballots reached each category. Nothing in the product shows them a name next to
        a vote.
      </li>
      <li>
        <strong>Other voters see nothing until the winners are announced.</strong> Counts stay hidden while
        voting runs, and appear only when the host publishes the results.
      </li>
      <li>
        <strong>We do not email you because you voted.</strong> The address is used to keep the vote honest.
      </li>
    </ul>
    <p>
      Legal basis: performing the service you asked for when you submit a ballot (Article 6(1)(b) GDPR), and
      our legitimate interest in a vote that cannot be stuffed (Article 6(1)(f)).
    </p>

    <h2>If you run an awards show</h2>
    <p>
      What you type in becomes a public page: the name of the show, the description, the categories, the
      nominees and the dates. The channel you sign in with is shown as the host. On the paid tier, a cover,
      a logo and images you upload are published on that page as well. Everything published is also listed
      in the public catalog, and pages above our publishing thresholds
      ({{ PUBLISH.minNominations }} categories and a description) are open to search engines.
    </p>
    <p>
      Nominees are a special case: naming a channel or a person on a public page is processing their data
      too. You are responsible for who you put on the ballot, and anyone can ask for a page to be reviewed
      with the Report button on it.
    </p>

    <h2>Technical data</h2>
    <p>
      As everywhere on Streams Charts, we collect IP address, device and browser identifiers, login
      timestamps and session identifiers to secure accounts and prevent fraud and abuse (Article 6(1)(f)
      GDPR). Routine session and security logs are kept for up to 90 days; where there is a suspected fraud
      case or a legal obligation, relevant logs may be kept for up to 24 months and are then deleted or
      de-identified.
    </p>

    <h2>How long the rest is kept</h2>
    <ul>
      <li>An awards page and its results stay online after the show - that is the point of the page.</li>
      <li>Ballots are kept while the awards page exists, because they are the result.</li>
      <li>
        A draft you never published lives in your own browser, not on our servers, until you publish it.
      </li>
      <li>Reports sent through the Report button are kept while the case is open.</li>
    </ul>

    <h2>Your rights</h2>
    <p>
      You can ask for access, correction, erasure, restriction, portability, and you can object to
      processing based on legitimate interests. Write to
      <a href="mailto:team@streamscharts.com">team@streamscharts.com</a> and we answer within 30 days. If
      you ask us to erase your data, a ballot you submitted is removed from the count with it.
    </p>
    <p>
      Deleting your Streams Charts account removes your profile and unlinks connected accounts, including
      Twitch - the procedure is described in the
      <a :href="SC_PRIVACY" rel="noopener">main policy</a>.
    </p>

    <h2>Children</h2>
    <p>
      Awards Maker is not directed to children under 13. If you believe a child has given us data, write to
      <a href="mailto:team@streamscharts.com">team@streamscharts.com</a> and we will remove it.
    </p>

    <h2>Free plan limits, for completeness</h2>
    <p>
      A free show is capped at {{ FREE.maxNominations }} categories and {{ FREE.maxVoters }} voters. The cap
      is a product limit, not a data one: votes already cast are kept when a show reaches it.
    </p>

    <h2>Contact</h2>
    <p>
      Privacy questions and requests: <a href="mailto:team@streamscharts.com">team@streamscharts.com</a>.
      Running a show with us: <a href="mailto:sales@streamscharts.com">sales@streamscharts.com</a>.
      The terms of the service are in the <NuxtLink to="/terms">Awards Maker terms</NuxtLink> and the
      <a :href="SC_TERMS" rel="noopener">Streams Charts terms of use</a>.
    </p>
  </LegalPage>
</template>
