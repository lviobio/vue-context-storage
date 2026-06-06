import { defineConfig, devices } from '@playwright/test'

/**
 * E2E tests run against two playgrounds in a real browser:
 *  - the demo playground (`npm run play`) at http://localhost:5173 under `/app/`,
 *  - a dedicated e2e playground (`npm run play:e2e`) at http://localhost:5174
 *    under `/e2e/`, holding minimal fixtures decoupled from the demo UI.
 *
 * `baseURL` points at the demo playground; specs targeting the e2e playground
 * use absolute URLs (which ignore `baseURL`).
 *
 * Specs live in `tests/e2e/` and use the `.spec.ts` suffix. Vitest is restricted to
 * `tests/` (see vitest.config.ts) so the two runners never pick up each other's files.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'npm run play -- --port 5173 --strictPort',
      url: 'http://localhost:5173/app/',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'npm run play:e2e -- --port 5174 --strictPort',
      url: 'http://localhost:5174/e2e/',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
})
