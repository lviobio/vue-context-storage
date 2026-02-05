import { defineConfig } from 'tsdown'
import { transform } from 'esbuild'

export default defineConfig({
  platform: 'neutral',
  fromVite: true,
  dts: { vue: true },
  plugins: [
    {
      name: 'drop-console',
      async transform(code, id) {
        if (id.endsWith('.ts') || id.endsWith('.vue')) {
          const result = await transform(code, {
            loader: 'ts',
            drop: ['console'],
          })
          return { code: result.code }
        }
      },
    },
  ],
})
