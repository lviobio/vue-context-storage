import path from 'node:path'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  root: './playground',
  base: process.env.NODE_ENV === 'production' ? '/vue-context-storage/' : '/app/',
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      'vue-context-storage/zod': path.resolve(__dirname, 'src/zod.ts'),
      'vue-context-storage': path.resolve(__dirname, 'src/index.ts'),
    },
  },
})
