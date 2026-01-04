import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  external: ['vue', 'vue-router', 'lodash'],
  splitting: false,
  minify: false,
  treeshake: true,
})
