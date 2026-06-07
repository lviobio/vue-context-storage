import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, reactive } from 'vue'
import { mount } from '@vue/test-utils'
import { z } from 'zod'
import { createWebStorageHandlerInstance } from '../../src/handlers/web-storage-base'
import { createLocalStorageHandler } from '../../src/handlers/local-storage'
import { createSessionStorageHandler } from '../../src/handlers/session-storage'
import {
  contextStorageLocalStorageHandler,
  contextStorageSessionStorageHandler,
} from '../../src/symbols'
import type { ContextStorageHandler } from '../../src/handlers'
import type { RegisterWebStorageHandlerOptions } from '../../src/handlers/web-storage-base/types'

// The web-storage handler always implements the optional `setEnabled`, so
// require it here to call it directly without a non-null assertion everywhere.
type WebStorageHandler<T extends Record<string, unknown>> = ContextStorageHandler<
  T,
  RegisterWebStorageHandlerOptions<T>
> &
  Required<Pick<ContextStorageHandler<T, RegisterWebStorageHandlerOptions<T>>, 'setEnabled'>>

/**
 * Minimal in-memory Storage implementation so individual tests can inject
 * failures (e.g. a throwing setItem) without touching the global storages.
 */
function createMemoryStorage(): Storage {
  const map = new Map<string, string>()
  return {
    get length() {
      return map.size
    },
    clear: () => map.clear(),
    getItem: (key: string) => (map.has(key) ? map.get(key)! : null),
    key: (index: number) => Array.from(map.keys())[index] ?? null,
    removeItem: (key: string) => map.delete(key),
    setItem: (key: string, value: string) => {
      map.set(key, String(value))
    },
  } as Storage
}

function makeInstance<T extends Record<string, unknown>>(
  storage: Storage,
  options: { listenToStorageEvents?: boolean } = {},
): WebStorageHandler<T> {
  return createWebStorageHandlerInstance<T>({
    storage,
    injectionKey: contextStorageSessionStorageHandler,
    handlerName: 'test-storage',
    options: { listenToStorageEvents: false, ...options },
  }) as WebStorageHandler<T>
}

describe('createWebStorageHandlerInstance', () => {
  let storage: Storage

  beforeEach(() => {
    storage = createMemoryStorage()
    vi.restoreAllMocks()
  })

  describe('register', () => {
    it('throws when no key is provided', () => {
      const handler = makeInstance(storage)
      expect(() => handler.register(reactive({ a: 1 }), {} as never)).toThrow(
        /requires a key option/,
      )
    })

    it('warns when the same data object is registered twice', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const handler = makeInstance(storage)
      const data = reactive({ a: 1 })
      handler.register(data, { key: 'k' })
      handler.register(data, { key: 'k' })
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('already registered'),
        expect.objectContaining({ key: 'k' }),
      )
    })

    it('returns a handle with stop, reset and wasChanged', () => {
      const handler = makeInstance(storage)
      const handle = handler.register(reactive({ a: 1 }), { key: 'k' })
      expect(typeof handle.stop).toBe('function')
      expect(typeof handle.reset).toBe('function')
      expect(handle.wasChanged.value).toBe(false)
    })
  })

  describe('syncStorageToRegisteredItem (storage → reactive)', () => {
    it('hydrates reactive data from pre-seeded storage on enable', () => {
      storage.setItem('k', JSON.stringify({ a: 5, b: 'x' }))
      const handler = makeInstance(storage)
      const data = reactive({ a: 1, b: '' })
      handler.register(data, { key: 'k' })
      handler.setEnabled(true, true)
      expect(data.a).toBe(5)
      expect(data.b).toBe('x')
    })

    it('does nothing when storage has no value for the key', () => {
      const handler = makeInstance(storage)
      const data = reactive({ a: 1 })
      handler.register(data, { key: 'missing' })
      handler.setEnabled(true, true)
      expect(data.a).toBe(1)
    })

    it('warns and keeps data on malformed JSON', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      storage.setItem('k', '{not valid json')
      const handler = makeInstance(storage)
      const data = reactive({ a: 1 })
      handler.register(data, { key: 'k' })
      handler.setEnabled(true, true)
      expect(data.a).toBe(1)
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to parse storage data'),
        'k',
      )
    })

    it('uses a custom deserializer when provided', () => {
      storage.setItem('k', 'a=9')
      const handler = makeInstance(storage)
      const data = reactive({ a: 1 })
      handler.register(data, {
        key: 'k',
        deserializer: (str) => ({ a: Number(str.split('=')[1]) }),
      })
      handler.setEnabled(true, true)
      expect(data.a).toBe(9)
    })

    it('applies a schema when restoring from storage', () => {
      storage.setItem('k', JSON.stringify({ count: '7' }))
      const handler = makeInstance(storage)
      const data = reactive({ count: 0 })
      handler.register(data, {
        key: 'k',
        schema: z.object({ count: z.number().default(0) }),
      })
      handler.setEnabled(true, true)
      expect(data.count).toBe(7)
    })
  })

  describe('syncRegisteredToStorage (reactive → storage)', () => {
    it('does not write while disabled', () => {
      const handler = makeInstance(storage)
      const data = reactive({ a: 1 })
      handler.register(data, { key: 'k' })
      expect(storage.getItem('k')).toBeNull()
    })

    it('writes current data to storage when enabled', () => {
      const handler = makeInstance(storage)
      const data = reactive({ a: 1 })
      handler.register(data, { key: 'k' })
      handler.setEnabled(true, false)
      expect(JSON.parse(storage.getItem('k')!)).toEqual({ a: 1 })
    })

    it('persists reactive changes via the deep watcher', async () => {
      const handler = makeInstance(storage)
      const data = reactive({ a: 1, nested: { v: 0 } })
      handler.register(data, { key: 'k' })
      handler.setEnabled(true, false)
      data.nested.v = 42
      await nextTick()
      expect(JSON.parse(storage.getItem('k')!)).toEqual({ a: 1, nested: { v: 42 } })
    })

    it('uses a custom serializer when provided', () => {
      const handler = makeInstance(storage)
      const data = reactive({ a: 3 })
      handler.register(data, { key: 'k', serializer: (d) => `a=${d.a}` })
      handler.setEnabled(true, false)
      expect(storage.getItem('k')).toBe('a=3')
    })

    it('logs an error when storage.setItem throws', () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {})
      const throwingStorage = createMemoryStorage()
      throwingStorage.setItem = () => {
        throw new Error('quota exceeded')
      }
      const handler = makeInstance(throwingStorage)
      const data = reactive({ a: 1 })
      handler.register(data, { key: 'k' })
      expect(() => handler.setEnabled(true, false)).not.toThrow()
      expect(error).toHaveBeenCalledWith(
        expect.stringContaining('Error writing to storage'),
        expect.any(Error),
      )
    })
  })

  describe('setEnabled state matrix', () => {
    it('initial enable hydrates from storage', () => {
      storage.setItem('k', JSON.stringify({ a: 99 }))
      const handler = makeInstance(storage)
      const data = reactive({ a: 1 })
      handler.register(data, { key: 'k' })
      handler.setEnabled(true, true)
      expect(data.a).toBe(99)
    })

    it('does not sync when there is nothing registered', () => {
      const handler = makeInstance(storage)
      expect(() => handler.setEnabled(true, true)).not.toThrow()
      expect(storage.length).toBe(0)
    })

    it('non-initial enable writes registered data to storage', () => {
      const handler = makeInstance(storage)
      const data = reactive({ a: 1 })
      handler.register(data, { key: 'k' })
      handler.setEnabled(true, false)
      expect(storage.getItem('k')).not.toBeNull()
    })
  })

  describe('handle behaviour', () => {
    it('wasChanged reflects mutations', () => {
      const handler = makeInstance(storage)
      const data = reactive({ a: 1 })
      const handle = handler.register(data, { key: 'k' })
      expect(handle.wasChanged.value).toBe(false)
      data.a = 2
      expect(handle.wasChanged.value).toBe(true)
    })

    it('reset restores initial data', () => {
      const handler = makeInstance(storage)
      const data = reactive({ a: 1 })
      const handle = handler.register(data, { key: 'k' })
      data.a = 7
      handle.reset()
      expect(data.a).toBe(1)
    })

    it('stop removes the item so later mutations are not persisted', async () => {
      const handler = makeInstance(storage)
      const data = reactive({ a: 1 })
      const handle = handler.register(data, { key: 'k' })
      handler.setEnabled(true, false)
      handle.stop()
      storage.setItem('k', JSON.stringify({ a: 1 }))
      data.a = 123
      await nextTick()
      // watcher stopped → storage not updated to 123
      expect(JSON.parse(storage.getItem('k')!)).toEqual({ a: 1 })
    })
  })

  describe('getInjectionKey', () => {
    it('returns the configured injection key', () => {
      const handler = makeInstance(storage)
      expect(handler.getInjectionKey()).toBe(contextStorageSessionStorageHandler)
    })
  })

  describe('edge cases', () => {
    it('returns without throwing when storage.getItem throws', () => {
      const throwingStorage = createMemoryStorage()
      throwingStorage.getItem = () => {
        throw new Error('access denied')
      }
      const handler = makeInstance(throwingStorage)
      const data = reactive({ a: 1 })
      expect(() => handler.register(data, { key: 'k' })).not.toThrow()
      expect(data.a).toBe(1)
    })

    it('ignores a deserializer that returns null', () => {
      storage.setItem('k', 'raw')
      const handler = makeInstance(storage)
      const data = reactive({ a: 1 })
      handler.register(data, { key: 'k', deserializer: () => null })
      handler.setEnabled(true, true)
      expect(data.a).toBe(1)
    })
  })
})

describe('storage events (cross-tab sync)', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('re-syncs a matching key from a storage event and ignores others', async () => {
    // Mount inside a component so onBeforeUnmount has a valid instance.
    let data!: { a: number }
    const Comp = defineComponent({
      setup() {
        const handler = createWebStorageHandlerInstance<{ a: number }>({
          storage: localStorage,
          injectionKey: contextStorageLocalStorageHandler,
          handlerName: 'localStorage',
          options: { listenToStorageEvents: true },
        }) as WebStorageHandler<{ a: number }>
        data = reactive({ a: 1 })
        handler.register(data, { key: 'k' })
        handler.setEnabled(true, true)
        return () => h('div')
      },
    })
    const wrapper = mount(Comp)

    // Another "tab" wrote a new value:
    localStorage.setItem('k', JSON.stringify({ a: 55 }))
    window.dispatchEvent(new StorageEvent('storage', { key: 'k' }))
    await nextTick()
    expect(data.a).toBe(55)

    // Event for a different key is ignored:
    localStorage.setItem('other', JSON.stringify({ a: 999 }))
    window.dispatchEvent(new StorageEvent('storage', { key: 'other' }))
    await nextTick()
    expect(data.a).toBe(55)

    wrapper.unmount()
    // After unmount the listener is removed → no further reaction.
    localStorage.setItem('k', JSON.stringify({ a: 77 }))
    window.dispatchEvent(new StorageEvent('storage', { key: 'k' }))
    await nextTick()
    expect(data.a).toBe(55)
  })

  it('ignores storage events while the handler is disabled', async () => {
    let data!: { a: number }
    const Comp = defineComponent({
      setup() {
        const handler = createWebStorageHandlerInstance<{ a: number }>({
          storage: localStorage,
          injectionKey: contextStorageLocalStorageHandler,
          handlerName: 'localStorage',
          options: { listenToStorageEvents: true },
        })
        data = reactive({ a: 1 })
        handler.register(data, { key: 'k' })
        // never enabled
        return () => h('div')
      },
    })
    const wrapper = mount(Comp)
    localStorage.setItem('k', JSON.stringify({ a: 55 }))
    window.dispatchEvent(new StorageEvent('storage', { key: 'k' }))
    await nextTick()
    expect(data.a).toBe(1)
    wrapper.unmount()
  })
})

describe('storage handler factories', () => {
  afterEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('createLocalStorageHandler returns a factory bound to localStorage', () => {
    const factory = createLocalStorageHandler()
    const Comp = defineComponent({
      setup() {
        const handler = factory() as WebStorageHandler<{ a: number }>
        expect(handler.getInjectionKey()).toBe(contextStorageLocalStorageHandler)
        const data = reactive({ a: 1 })
        handler.register(data, { key: 'lk' })
        handler.setEnabled(true, false)
        return () => h('div')
      },
    })
    mount(Comp).unmount()
    expect(localStorage.getItem('lk')).not.toBeNull()
  })

  it('createSessionStorageHandler returns a factory bound to sessionStorage', () => {
    const factory = createSessionStorageHandler()
    const Comp = defineComponent({
      setup() {
        const handler = factory() as WebStorageHandler<{ a: number }>
        expect(handler.getInjectionKey()).toBe(contextStorageSessionStorageHandler)
        const data = reactive({ a: 1 })
        handler.register(data, { key: 'sk' })
        handler.setEnabled(true, false)
        return () => h('div')
      },
    })
    mount(Comp).unmount()
    expect(sessionStorage.getItem('sk')).not.toBeNull()
  })
})
