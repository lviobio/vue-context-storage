import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  root: './playground',
  base: process.env.NODE_ENV === 'production' ? '/vue-context-storage/' : '/app/',
  plugins: [vue()],
})
