import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Handler tests only. They stub Nitro's auto-imported globals and mock the
// server/utils layer, so MySQL is never touched and the suite runs in a second.
export default defineConfig({
  resolve: {
    alias: {
      // Nuxt provides this alias at build time; vitest runs the handlers on
      // their own and has to be told where shared/ is.
      '#shared': fileURLToPath(new URL('./shared', import.meta.url)),
    },
  },
  test: {
    include: ['tests/**/*.spec.ts'],
    environment: 'node',
  },
})
