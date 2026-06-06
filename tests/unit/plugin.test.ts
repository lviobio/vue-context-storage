import { describe, expect, it } from 'vitest'
import { createApp } from 'vue'
import VueContextStoragePlugin, { VueContextStoragePlugin as NamedPlugin } from '../../src/plugin'

describe('VueContextStoragePlugin', () => {
  it('exposes the same plugin as default and named export', () => {
    expect(VueContextStoragePlugin).toBe(NamedPlugin)
  })

  it('registers all components globally on install', () => {
    const app = createApp({ render: () => null })
    app.use(VueContextStoragePlugin)

    for (const name of [
      'ContextStorageActivator',
      'ContextStorageCollection',
      'ContextStorageProvider',
      'ContextStorage',
      'ContextStoragePrefix',
    ]) {
      expect(app.component(name)).toBeTruthy()
    }
  })
})
