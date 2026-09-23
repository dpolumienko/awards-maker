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

  modules: ['@nuxtjs/tailwindcss', '@nuxtjs/seo'],

  tailwindcss: { configPath: './tailwind.config.ts' },

  // Builder-side pages read the draft out of localStorage, so there is nothing
  // for the server to render and SSR only produced hydration mismatches.
  // The published awards page will move back to SSR once it has a real API -
  // it needs to be indexable.
  routeRules: {
    '/create': { ssr: false },
    '/my-awards': { ssr: false },
    '/my-awards/**': { ssr: false },
    '/catalog': { ssr: false },
    '/a/**': { ssr: false },
  },

  // A project site on GitHub Pages lives under /<repo>/, and nothing served from a
  // sub-path may own /robots.txt - the module refuses to build one. The demo does
  // not need it; the real subdomain deploy has no base URL and keeps it.
  robots: { robotsTxt: !process.env.NUXT_APP_BASE_URL || process.env.NUXT_APP_BASE_URL === '/' },

  // The host's own pages are noindex; a noindex URL in the sitemap is a mixed
  // signal, so they are kept out of it. Award pages are dynamic and get in
  // through their own source once there is an API.
  sitemap: { exclude: ['/my-awards', '/my-awards/**'] },

  // Domain is still open (subdomain decision) - placeholder until it is fixed.
  site: {
    url: 'https://awards.streamscharts.com',
    name: 'Awards Maker',
    description:
      'Run your own streamer awards: pick categories, nominate any channel, let chat vote or choose winners yourself. Free with a Twitch login.',
    defaultLocale: 'en',
  },

  // The prerender cache is written into node_modules/.cache, which sits inside a
  // OneDrive folder here: OneDrive grabs the file between write and rename and the
  // build dies with EPERM, at a different route every time. The cache buys nothing
  // for a build that runs once, so it goes to memory.
  nitro: { storage: { cache: { driver: 'memory' } } },

  // hls.js is only pulled in when a Kick clip opens; telling Vite about it up
  // front keeps that first open from triggering a dep re-optimise and a reload.
  vite: { optimizeDeps: { include: ['hls.js'] } },

  // Off by default: the overlay badge lands in every verification screenshot.
  devtools: { enabled: false },
})
