// On the static demo build only: /api/* is answered in the browser by
// demo/api.ts, since GitHub Pages has no server. Runs first so the session
// check nuxt-auth-utils makes on load already goes through it. Anywhere else
// this is a no-op and demo/api.ts is never fetched.
export default defineNuxtPlugin({
  name: 'demo-api',
  enforce: 'pre',
  async setup() {
    if (!useRuntimeConfig().public.demo) return
    const { demoApi } = await import('~/demo/api')
    const real = globalThis.$fetch
    const routed = ((request: unknown, options?: Record<string, unknown>) => {
      const url = typeof request === 'string' ? request : String((request as { url?: string })?.url ?? '')
      if (url.startsWith('/api/')) return demoApi(url, options as Parameters<typeof demoApi>[1])
      return real(request as string, options)
    }) as typeof globalThis.$fetch
    Object.assign(routed, real)
    globalThis.$fetch = routed
  },
})
