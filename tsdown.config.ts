import { defineConfig } from 'tsdown'
import { transform } from 'esbuild'

export default defineConfig({
  entry: ['src/index.ts'],
  platform: 'browser',
  fromVite: true,
  dts: { vue: true },
  plugins: [
    {
      name: 'drop-console-debug',
      async transform(code, id) {
        if ((id.endsWith('.ts') && !id.endsWith('.d.ts')) || id.endsWith('.vue')) {
          const result = await transform(code, {
            loader: 'ts',
            pure: ['console.debug'],
          })
          return { code: result.code }
        }
      },
    },
  ],
})
