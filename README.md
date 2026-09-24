# Awards Maker

Landing and (later) the product for streamer-made awards, living on its own subdomain.

Stack matches the other vibe projects (TikTokStats, DoHuya): **Nuxt 3 with Nuxt 4 compatibility, Vue 3, Tailwind 3, TypeScript**, deployed to Cloudflare.

Animation: **GSAP + ScrollTrigger** (reveals, scrubbed step line, counters), **Lenis** (smooth scroll, driven off the GSAP ticker) and **motion-v** (Motion for Vue - the springs inside the ported accordion). Everything is switched off under `prefers-reduced-motion`.

## Running it

```bash
npm install
npm run dev        # http://localhost:3000
```

There is no backend yet. Everything a host builds, every ballot and every tally
lives in `localStorage` in the shape the API will take, so the whole flow works in
one browser and nothing is shared between two.

**Pre-release:** the paid tier is unlocked by default (`app/composables/usePro.ts`)
because there is no checkout to buy it with - that switch goes away with payments.

## Demo

A GitHub Actions workflow that builds the prototype as a static site and publishes
it to Pages is ready at `.github/workflows/pages.yml` in the working copy. It is not
pushed yet: that needs a token with the `workflow` scope (`gh auth refresh -s workflow`,
then commit the file). Pages on a private repository also requires a paid GitHub plan -
on the free plan the demo starts working the moment the repository is public.

Build it with `scripts/build-demo.sh` (usage at the top of the file): it renders
the landing pages plus the award pages listed in `PRERENDER_ROUTES` from a local
database, marks every page noindex, and puts a sign-in screen over the site
(`scripts/demo-gate.mjs` - a screen, not security: the branch is public). Commit
`.output/public` as the `gh-pages` branch.

## Components ported from 21st.dev

Two components were taken 1:1 and ported from React to Vue; the animation values are the authors', unchanged. Attribution sits at the top of each file.

| File | Source | Notes |
|---|---|---|
| `app/components/ui/SpotlightCard.vue` | [feature-08 by hirael](https://21st.dev/@hirael/components/feature-08), MIT (Mohammad Shehadeh) | Only the layout is left. The crosshairs and bleeding hairlines went in the 2026-09-14 design review; the pointer-follow spotlight and the warm top wash went in the 2026-09-16 audit - eight gold radial glows on one page is the generated-UI signature, so the page keeps one, in the hero. |
| `app/components/ui/InteractiveAccordion.vue` | [interactive-accordion by jatin-yadav05](https://21st.dev/@jatin-yadav05/components/interactive-accordion) | Framer Motion → motion-v, same spring config. Numbered circles, plus→cross, progressive underline. |
| `app/components/ui/GlowFilterDefs.vue` + `GlowText.vue` | [illuminated-hero by efferd](https://21st.dev/@efferd/components/illuminated-hero) | The multi-layer SVG glow filter, unchanged except for the deep layers' vertical offsets (64 → 10, 16 → 6): they were tuned for ~60px text and ghosted at our 104px display. |
| `app/components/ui/GlowDivider.vue` | [sparkles-title3 by uilayout.contact](https://21st.dev/@uilayout.contact/components/sparkles-title3) | The three-rule light bar (blurred, sharp, hot core). Its particle util is not published with the component, so `SparkleField.vue` next to it is ours. |
| `app/components/ui/SnapCarousel.vue` | [snap-carousel by ddoemonn](https://21st.dev/@ddoemonn/components/snap-carousel) | Drag physics kept: velocity-projected flick clamped to one slide past the anchor, rubber band at the ends, peek masks, bar indicators, arrow/Home/End keys. React + Motion → Vue + GSAP, and `perView` added so three cards share a row on desktop. |
| `app/components/ui/InfiniteMovingCards.vue` | [infinite-moving-cards by nexus-ui](https://21st.dev/@nexus-ui/components/infinite-moving-cards) | Loop algorithm, speed map, wrap logic, ResizeObserver measuring, hover pause and edge masks kept; `useAnimationFrame` replaced with a plain rAF loop and a slot instead of `renderItem`. |

Their catalog ships React/shadcn, so `npx shadcn add` is not usable here - each component is ported by hand.

## Graphics

`public/img/` holds vector art reused from the earlier landing work, recoloured from the
Streams Charts Dark palette to ours (`illustrations/` for the three steps and the free-plan
stage, `icons/` for category marks and catalog cover watermarks). Platform colours inside the
illustrations - Twitch purple, Kick green - were left alone on purpose.

SVGs are loaded through `<img>`, which cannot inherit `currentColor`, so the gold is baked
into the icon files.

Removed again: `StackedFeed.vue` (notification-list by skyleen77) - the stacked pile did not read as anything on this page, replaced by `LiveAwardCard.vue`.

Own components in the same spirit: `StageLights.vue` (two beams swinging out of phase),
`SparkleField.vue` (canvas motes drifting up through the light bar), and the live vote
feed inside `HeroSection.vue`.

## Design

This site does **not** use the Streams Charts Dark design system. Tokens and rules:
`../assets/design/awards-maker/DESIGN.md`, mirrored into `tailwind.config.ts`. Square corners are a rule,
not an oversight - there is no border-radius scale.

## Copy and SEO

Landing copy, meta and FAQ are frozen in `../outputs/awards-landing-copy-2026-09-13.md` and
`../outputs/awards-landing-seo-brief-2026-09-13.md`. Change them there first, then here.

## Commands

```bash
npm install
npm run dev
```

## What is built

The landing page (`app/pages/index.vue`) and its sections. Section order follows the intent sequence in
`../outputs/awards-landing-seo-brief-2026-09-13.md` §3.2. A design review and a WCAG 2.1 AA audit were run
on 2026-09-14 and their findings applied - see the project log for what changed.

## Paid features

Nothing paid is blocked in the builder. Extra nominations, the Look section and image/clip nominees all work,
each marked with a `Paid` pill, and the preview honours them. `PublishPanel` lists what goes beyond free and
offers two ways out: upgrade, or strip the paid parts and publish free. Rules and the visual pattern are in
`../assets/design/awards-maker/DESIGN.md` (§4 and the Do/Don't list).

## Builder

`/create` is the awards builder (form + live preview), `/my-awards` lists what you published and
`/a/<slug>` is the published awards page. All three are `ssr: false` for now because the draft lives in
`localStorage`; `/a/<slug>` goes back to SSR when it has an API, since it has to be indexable.
Channel search runs on `app/data/channels.mock.ts`.

## What is next

Voting on the public awards page, then results and share cards. The builder plan, with what is already
done, is in `../outputs/awards-maker-builder-plan-2026-09-14.md`.

## Open

- The domain in `nuxt.config.ts` (`site.url`) is a placeholder until the subdomain decision is final.
- Known debt: no mobile nav (links are hidden below `lg`), and the logged-in `Your awards` block from the
  spec is not built yet - it waits for real auth.

## Running it

    cp .env.example .env          # fill in NUXT_SESSION_PASSWORD at least
    docker compose up -d db       # MySQL on 127.0.0.1:3307
    npm install
    npm run dev                   # http://localhost:3000

The schema is applied by the app itself on boot, so there is no migration step to
remember. `npm run migrate -- --status` lists what has been applied if you want
to look.

Signing in needs a Twitch application with **two** redirect URIs, because Twitch
matches them exactly:

- `http://localhost:3000/auth/twitch` - voters (`user:read:email`)
- `http://localhost:3000/auth/twitch-host` - hosts (the full set, as on Streams Charts)

Put its client id and secret in `.env`. Without them the pages all work; the
sign-in buttons are what stops.

`ADMIN_TWITCH_LOGINS` lists Twitch logins that are admins from their first
sign-in. An admin publishes paid shows without paying, which is how the paid tier
gets exercised before Stripe is switched on.

    npm test                      # handler tests, no database needed
    npm run build                 # .output/, the node-server bundle

Deploying: `deploy/README.md`.
