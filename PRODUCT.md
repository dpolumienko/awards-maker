# Product

<!-- impeccable:product-schema 1 -->

Awards Maker. Written 2026-09-16 from the project's own record; the canonical decision log stays
`../docs-auto/knowledge/streamer_awards.md` (workspace `SC Product`). Where the two disagree, that file
wins and this one gets updated. `[U]` = decided by the product owner, `[V]` = verified in data,
`[W]` = external source, `[?]` = open.

## Platform

web

## Users

- **Host - the streamer.** Signs in with Twitch, builds the awards, sets the dates, announces the
  winners. Two bands carry equal weight in release 1 `[U 2026-09-16]`: a small or mid channel running
  a first season for its chat (the free tier is sized for it) and large channels or agencies running
  a real show (paid, or Enterprise where we run it for them).
- **Voter - the viewer.** Arrives from a link in chat or a repost, usually on a phone. Reads and picks
  without signing in; Twitch login is asked only at submit, with the minimal scope (`user:read:email`).
  One ballot per account, one vote per category.
- **Nominee.** Any channel in the Streams Charts database (Twitch, Kick, YouTube) or plain text. On the
  paid tier also an uploaded image or a clip behind a link.
- **Visitor from search.** Lands on a published awards page or the catalog without knowing the product.
  Release 1 counts this person: organic traffic to awards pages is one of the two success measures.

## Product Purpose

A streamer makes awards for their own community; we host the page, count the votes, keep the results
online after the show, and aggregate every published awards into a public catalog. Streams Charts
nominates nothing - the host decides the categories, the nominees and the dates.

Success in release 1 `[U 2026-09-16]`, in this order:

1. **Published awards** - how many streamers get from an empty form to a live page.
2. **Organic traffic to awards pages** - the catalog and the pages themselves earning search entries.

Conversion to the paid tier is a release 2 measure, not a release 1 one.

## Positioning

- The product lives **on a subdomain, outside the Streams Charts product** `[U]`. It is not part of the
  Streamer subscription, has its own design system and its own navigation.
- The bet, in the owner's order `[U 2026-09-16]`: **SEO and traffic first, the tool second.** The tool
  exists to fill the catalog with pages worth indexing.
- What a neighbouring product could not truthfully copy: nominees come out of the Streams Charts
  channel database - real channels across Twitch, Kick and YouTube, with follower counts and live
  state. No competitor of the "awards builder" shape has that database behind the picker.
- Not The Streamer Awards (QTCinderella's show) `[W]`. We never trade on that name; an awards whose
  title contains the phrase goes out `noindex`.

## Operating Context

- **Host:** `/create` - ready-made category sets or their own, nominees from search or text, dates,
  optional partners, optional paid look. Publish lands on `/a/<slug>`; the link goes into chat. After
  voting closes the host announces the winners on stream and publishes the results on the same URL.
- **Voter:** opens the page on a phone, fills the ballot, signs in once at submit. There is no second
  submit and no interim counts to watch.
- **Search visitor:** finds an awards page or the catalog, and can start their own from either.
- **Moderation:** complaints from the public page go to an `Awards` section in the Streams Charts
  admin `[? not approved yet]`.
- No backend yet: drafts, ballots and tallies live in `localStorage` in the shape the API will use.

## Capabilities and Constraints

- **Free:** 5 nominations, 200 unique voters per awards, one active awards at a time, 29-character
  name, nominees are channels or text.
- **Paid:** one-off purchase per awards, **$30-40 `[? final number undecided]`**, no subscription.
  Lifts both ceilings and adds the page's own look (background theme, accent colour, headline font,
  cover, channel logo from the Twitch avatar), image and clip nominees, and a minimum voter account age.
- **Enterprise:** by contact - we set up and run the show.
- **Voting:** open viewer vote only (jury mode was cut from the product 2026-09-14), Twitch only, one
  vote per category, one ballot per account, no interim results for anyone including the host.
- **Page states:** not open yet, open, closed at the free voter ceiling, closed and counting, winners
  announced. Voting is closed by the clock or the ceiling; **winners are published by the host**, not
  by the ceremony date.
- **Indexing thresholds, which are also the publish rules:** at least 3 nominations, at least 2
  nominees in each, a description. A name containing "Streamer Awards" is kept out of search.
- **Partners:** name plus an external link, `rel="nofollow sponsored"`, moderated.
- **Auth is split by scope:** creator gets the full Streams Charts authorization, voter the minimal one.
- **Stack:** Nuxt 3 (Nuxt 4 compatibility) + Vue 3 + Tailwind 3 + TypeScript, GSAP + ScrollTrigger,
  Lenis, motion-v. Builder routes are `ssr: false` while the draft lives in the browser; `/a/**` returns
  to SSR when the API exists, because it has to be indexable.
- **Language:** English only at launch.
- **Releases:** R1 free MVP, target first half of November 2026 (landing, builder, voting, catalog,
  sharing, moderation). R2 paid version, before December. R3 growth: story cards, templates, an OBS
  reveal mode, stronger anti-fraud, Kick and YouTube login.
- **Open `[?]`:** what exactly lives on the subdomain (this blocks the final URL scheme and canonicals);
  the price inside the $30-40 range; the composition of the admin `Awards` section, who works the
  complaint queue and to what SLA; who writes the usage rules.

## Brand Commitments

- **Own design system, deliberately not Streams Charts Dark:** `../assets/design/awards-maker/DESIGN.md`.
  Black canvas, Trophy Gold `#D9A441`, Archivo, radius scale 10/8/pill, platform colour cues, on-air red.
  Aesthetic reference is "gala" (Lamborghini/Bugatti register), taken as a start for our own system, not
  cloned.
- A streamer's own accent colour replaces gold **inside their awards page only** - never in our header,
  footer, plan cards or upsells.
- Every published page carries the **"Made with Streams Charts"** credit and links back to the main site.
- Public copy must read as human writing (workspace rule: >80% human-writer, no em dashes) and never
  claim a connection to another show.

## Evidence on Hand

- UA Stream Awards 2025, our own show: **9,786 voters** `[V]`. A show of that size breaks the free
  ceiling immediately.
- The Streamer Awards 2025: **1,090,358 voters** `[W]` - scale reference only, not our audience.
- Streamer Recap 2025, launch week `[V]`: 36,190 users on `/recap`, 5,860 logins, 960 Download clicks,
  1,800 t.co referrals, 29 from Instagram. Creator-facing features do pull traffic here; the share loop
  was the weak part, which is why sharing is a named release 1 concern.
- Signed-in Streams Charts users, August 2026 `[V]`: 5,307 not_paid_pro, 185 streamer, 183 pro.
- **No real awards data exists yet.** Channel search runs on mock channels; vote counts start at zero.
  Invented counts on a fresh page ("212 voted") are a bug we already shipped once and removed.
- Built and screenshotted: landing, `/create`, `/my-awards`, `/a/<slug>` in this repo;
  screenshots in `../outputs/awards-landing-img/`, plans and copy decks in `../outputs/`.

## Product Principles

1. **Search first.** A page that cannot be indexed is not finished. The publish checklist and the
   indexing thresholds are deliberately the same numbers.
2. **Paid features stay visible and usable, marked `Paid`.** The bill is settled at publish, with two
   honest exits: upgrade and keep everything, or drop the paid parts and publish free.
3. **Never fabricate product numbers.** Zero votes reads as zero; no seeded counts, no invented proof.
4. **The host owns the show** - categories, nominees, dates, and the moment the winners appear.
5. **The subdomain is its own product.** No Streams Charts Dark tokens, no Streams Charts tool blocks,
   own navigation, own design system.

## Accessibility & Inclusion

WCAG 2.1 AA is the floor, checked on every new surface. Voting has to work on a phone and from the
keyboard: each category is a radio group with one tab stop, arrows move the choice, the ballot count is
announced politely, and confirmation takes focus. Motion respects `prefers-reduced-motion`. English only
at launch, so copy stays plain enough to read as a second language.
