import { defineConfig, devices } from '@playwright/test'

/**
 * E2E tests run against the playground app (`npm run play`) in a real browser.
 * The playground is served by Vite at http://localhost:5173 under the `/app/` base.
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
  webServer: {
    command: 'npm run play -- --port 5173 --strictPort',
    url: 'http://localhost:5173/app/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
