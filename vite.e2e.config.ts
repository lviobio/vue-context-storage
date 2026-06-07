import path from 'node:path'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

/**
 * Dedicated playground for Playwright e2e tests.
 *
 * Kept separate from the demo playground (`./playground`) so that e2e fixtures
 * stay minimal and stable, decoupled from the demo UI (and from the GitHub
 * Pages build). Served under the `/e2e/` base — see `playwright.config.ts`.
 */
export default defineConfig({
  root: './playground-e2e',
  base: '/e2e/',
  plugins: [vue()],
  resolve: {
    alias: {
      'vue-context-storage': path.resolve(import.meta.dirname, 'src/index.ts'),
    },
  },
})
