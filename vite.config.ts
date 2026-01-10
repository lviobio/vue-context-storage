import vue from '@vitejs/plugin-vue'
/// <reference types="vitest/config" />
import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vite'

export default defineConfig({
  root: './playground',
  base: process.env.NODE_ENV === 'production' ? '/vue-context-storage/' : '/app/',
  plugins: [vue()],
  test: {
    root: '.',
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
      headless: true,
    },
  },
})
