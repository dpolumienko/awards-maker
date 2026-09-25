import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-04-10',

  future: {
    compatibilityVersion: 4,
  },

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1.0',
      meta: [
        { name: 'theme-color', content: '#000000' },
        // The fallback share card. Pages with their own override it; on routes
        // running with `ssr: false` this is the only one a crawler ever sees,
        // because nothing the app adds to the head is in the served HTML.
        { property: 'og:image', content: 'https://awards.streamscharts.com/og/home.png' },
        // No twitter:image: X falls back to og:image, and a global one here
        // outranked every page's own card - /plans unfurled on X as the landing.
      ],
      link: [
        // the Streams Charts mark (public/icon.svg, cut from the SC logo)
        { rel: 'icon', href: '/favicon.ico', sizes: '48x48' },
        { rel: 'icon', type: 'image/svg+xml', href: '/icon.svg' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        // Archivo only - the paid headline faces load where they are drawn
        // (composables/useDisplayFonts.ts). Not render-blocking: the stylesheet
        // is fetched as `print` and switched on when it lands, so the first
        // paint happens in the fallback and swaps (Lighthouse had it holding
        // mobile FCP for ~780 ms).
        { rel: 'preload', as: 'style', href: 'https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&display=swap' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&display=swap',
          media: 'print',
          onload: "this.media='all'",
        },
      ],
    },
  },

  css: ['~/assets/css/main.css', '~/assets/css/palettes.css'],

  modules: ['@nuxtjs/tailwindcss', '@nuxtjs/seo', 'nuxt-auth-utils'],

  tailwindcss: { configPath: './tailwind.config.ts' },

  // The published awards page and the catalog render on the server now that
  // there is an API behind them - they are the two pages the whole SEO case
  // rests on, and until the backend landed a crawler saw an empty shell.
  //
  // The host's own pages stay client-rendered: they are one person's private
  // workspace, they are noindex anyway, and rendering them on the server buys
  // a signed-in user nothing.
  routeRules: {
    // noindex as a header too, not only a meta tag the client adds after
    // hydration - an ssr:false page serves no meta a crawler can read (SEO audit)
    '/create': { ssr: false, robots: false },
    '/my-awards': { ssr: false, robots: false },
    '/my-awards/**': { ssr: false, robots: false },
    // static files that never change under their name
    '/img/**': { headers: { 'Cache-Control': 'public, max-age=604800' } },
    '/og/*.png': { headers: { 'Cache-Control': 'public, max-age=86400' } },
    '/favicon.ico': { headers: { 'Cache-Control': 'public, max-age=604800' } },
    // Awards Maker runs under Streams Charts' legal pages (review 2026-09-24);
    // the old URLs point there instead of 404ing. Kept in step with app/data/sc.ts.
    '/terms': { redirect: { to: 'https://streamscharts.com/terms-of-use', statusCode: 301 } },
    '/privacy': { redirect: { to: 'https://streamscharts.com/privacy-policy', statusCode: 301 } },
    '/api/**': { headers: { 'Cache-Control': 'no-store' } },
    '/auth/**': { headers: { 'Cache-Control': 'no-store' } },
    '/**': {
      headers: {
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
      },
    },
  },

  // The host's own pages are noindex; a noindex URL in the sitemap is a mixed
  // signal, so they are kept out of it. Award pages come in through their own
  // source, which is the whole point of the catalog existing.
  sitemap: {
    exclude: ['/my-awards', '/my-awards/**', '/create'],
    sources: ['/api/__sitemap__/urls'],
  },

  // nuxt-og-image comes with @nuxtjs/seo and answers every image URL with 400
  // on this stack (scripts/gen-og.py). Left on, it still rewrites every
  // og:image that is not https - dropping the ?v= the awards page puts on its
  // card - so it is switched off, and cards come from public/og/ and
  // server/routes/og/a/ instead.
  ogImage: { enabled: false },

  // Domain is still open (subdomain decision) - placeholder until it is fixed.
  // In production NUXT_PUBLIC_SITE_URL overrides `url` and must be the public
  // https host: canonicals, the sitemap, robots.txt and every og:image are built
  // from it. /healthz fails when it is not (server/routes/healthz.get.ts).
  // NUXT_SITE_ENV=staging on any other deploy keeps it out of search.
  site: {
    url: 'https://awards.streamscharts.com',
    name: 'Streams Charts Awards',
    description:
      'Run your own streamer awards: pick the categories, nominate channels from Twitch, Kick and YouTube, and let your viewers vote. Free to start.',
    defaultLocale: 'en',
  },

  // The site's publisher is Streams Charts. Without an identity the first
  // organizer on an awards page became WebSite.publisher (SEO audit).
  schemaOrg: {
    identity: {
      type: 'Organization',
      name: 'Streams Charts',
      url: 'https://streamscharts.com',
      logo: '/img/logos/streamscharts-light.svg',
    },
  },

  // Canonicals carry no query string at all: ?state=, ?status=, ?ideas= and the
  // design switcher's ?palette= are views of one page, not pages.
  seo: { canonicalQueryWhitelist: [] },

  // A project site on GitHub Pages lives under /<repo>/, and nothing served from a
  // sub-path may own /robots.txt - the module refuses to build one. The demo does
  // not need it; the real subdomain deploy has no base URL and keeps it.
  robots: {
    robotsTxt: !process.env.NUXT_APP_BASE_URL || process.env.NUXT_APP_BASE_URL === '/',
    // the OAuth round trip; /api stays open, the builder needs it to render
    disallow: ['/auth/'],
  },

  runtimeConfig: {
    // Empty on purpose. mysql2 fills its own blanks - localhost, the OS user -
    // and then fails deep in the driver; server/utils/db.ts refuses instead.
    // These resolve at BUILD time, so a built server is corrected only with the
    // NUXT_ spellings (NUXT_MYSQL_USER, not NUXT_MYSQL_USERNAME).
    mysql: {
      host: process.env.MYSQL_HOST || '',
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      user: process.env.MYSQL_USERNAME || '',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || '',
    },
    // Twitch logins that are admins the moment they sign in. An admin creates
    // paid shows without paying, which is how the paid tier gets tested.
    adminTwitchLogins: process.env.ADMIN_TWITCH_LOGINS || 'streams_user2',
    uploadsDir: process.env.UPLOADS_DIR || './.uploads',
    // Streams Charts API, for the builder's channel search (server/api/channels/search.get.ts).
    // Empty: the search falls back to the sample channels.
    streamsCharts: {
      clientId: process.env.STREAMS_CHARTS_CLIENT_ID || '',
      token: process.env.STREAMS_CHARTS_TOKEN || '',
    },
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY || '',
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
      priceId: process.env.STRIPE_PRICE_ID || '',
    },
    public: {
      // set by scripts/build-demo.sh: the static copy with no server behind it
      demo: process.env.NUXT_PUBLIC_DEMO === '1',
      // Twitch checks an embed's `parent` against the framing host, so the
      // player needs to be told what that host is rather than guess from the
      // address bar. Empty in dev, where localhost is correct anyway.
      siteHost: process.env.NUXT_PUBLIC_SITE_HOST || '',
      // Search Console's HTML-tag verification, if the DNS route is not used
      googleSiteVerification: process.env.NUXT_PUBLIC_GOOGLE_SITE_VERIFICATION || '',
    },
  },

  nitro: {
    preset: process.env.NITRO_PRESET || 'node-server',
    // satori shapes text with harfbuzzjs, which reads hb.wasm off disk next to
    // itself at runtime. The tracer follows imports, not readFileSync, so
    // without this the built server answered every /og/a/ card with a 500.
    externals: { traceInclude: [fileURLToPath(new URL('./node_modules/harfbuzzjs/hb.wasm', import.meta.url))] },
    compressPublicAssets: true,
    // The static demo (scripts/build-demo.sh) renders a few award pages from a
    // local database; a normal build prerenders nothing extra.
    prerender: { routes: (process.env.PRERENDER_ROUTES || '').split(',').filter(Boolean) },
    // The prerender cache is written into node_modules/.cache, which sits inside a
    // OneDrive folder here: OneDrive grabs the file between write and rename and
    // the build dies with EPERM, at a different route every time. It goes to the
    // machine's temp directory instead, which nothing syncs.
    storage: { cache: { driver: 'fs', base: join(tmpdir(), 'awards-maker-nitro-cache') } },
  },

  // hls.js is only pulled in when a Kick clip opens; telling Vite about it up
  // front keeps that first open from triggering a dep re-optimise and a reload.
  vite: { optimizeDeps: { include: ['hls.js'] } },

  // Off by default: the overlay badge lands in every verification screenshot.
  devtools: { enabled: false },
})
