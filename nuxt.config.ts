import { tmpdir } from 'node:os'
import { join } from 'node:path'

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
        { name: 'twitter:image', content: 'https://awards.streamscharts.com/og/home.png' },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          // Archivo is the system font; the other three are the paid headline
          // options in the builder's Look section.
          href: 'https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&family=Anton&family=Playfair+Display:wght@700;800&family=Space+Grotesk:wght@500;700&display=swap',
        },
      ],
    },
  },

  css: ['~/assets/css/main.css'],

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
    '/create': { ssr: false },
    '/my-awards': { ssr: false },
    '/my-awards/**': { ssr: false },
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

  // A project site on GitHub Pages lives under /<repo>/, and nothing served from a
  // sub-path may own /robots.txt - the module refuses to build one. The demo does
  // not need it; the real subdomain deploy has no base URL and keeps it.
  robots: { robotsTxt: !process.env.NUXT_APP_BASE_URL || process.env.NUXT_APP_BASE_URL === '/' },

  // The host's own pages are noindex; a noindex URL in the sitemap is a mixed
  // signal, so they are kept out of it. Award pages come in through their own
  // source, which is the whole point of the catalog existing.
  sitemap: {
    exclude: ['/my-awards', '/my-awards/**'],
    sources: ['/api/__sitemap__/urls'],
  },

  // Domain is still open (subdomain decision) - placeholder until it is fixed.
  site: {
    url: 'https://awards.streamscharts.com',
    name: 'Awards Maker',
    description:
      'Run your own streamer awards: pick categories, nominate any channel, let chat vote or choose winners yourself. Free with a Twitch login.',
    defaultLocale: 'en',
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
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY || '',
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
      priceId: process.env.STRIPE_PRICE_ID || '',
    },
    public: {
      // Twitch checks an embed's `parent` against the framing host, so the
      // player needs to be told what that host is rather than guess from the
      // address bar. Empty in dev, where localhost is correct anyway.
      siteHost: process.env.NUXT_PUBLIC_SITE_HOST || '',
    },
  },

  nitro: {
    preset: process.env.NITRO_PRESET || 'node-server',
    compressPublicAssets: true,
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
