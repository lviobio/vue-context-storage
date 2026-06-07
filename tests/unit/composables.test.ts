import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, inject, reactive } from 'vue'
import { mount } from '@vue/test-utils'
import { useContextStorage } from '../../src/composables/useContextStorage'
import {
  useContextStorageItemProvider,
  useContextStorageProvider,
} from '../../src/composables/useContextStorageProvider'
import { useContextStorageCollection } from '../../src/composables/useContextStorageCollection'
import { useContextStorageActivator } from '../../src/composables/useContextStorageActivator'
import { createCollectionManager, createItem } from '../../src/collection'
import { createSessionStorageHandler } from '../../src/handlers/session-storage'
import {
  contextStorageCollectionInjectKey,
  contextStorageCollectionItemInjectKey,
} from '../../src/injectionSymbols'

const sessionHandlers = [createSessionStorageHandler()]

describe('useContextStorage', () => {
  it('throws for an unknown handler type', () => {
    const Comp = defineComponent({
      render: () => null,
      setup() {
        useContextStorage('nope' as never, reactive({ a: 1 }), {} as never)
      },
    })
    expect(() => mount(Comp)).toThrow(/Unknown handler type/)
  })

  it('throws when the handler is not provided', () => {
    const warnHandler = vi.fn()
    const Comp = defineComponent({
      render: () => null,
      setup() {
        useContextStorage('sessionStorage', reactive({ a: 1 }), { key: 'k' })
      },
    })
    expect(() => mount(Comp, { global: { config: { warnHandler } } })).toThrow(
      /Handler not provided/,
    )
    expect(warnHandler.mock.calls[0]?.[0]).toContain('context-storage-session-storage-handler')
  })

  it('returns a working handle when the handler is provided', () => {
    let handle: ReturnType<typeof useContextStorage> | undefined
    const Leaf = defineComponent({
      setup() {
        handle = useContextStorage('sessionStorage', reactive({ a: 1 }), { key: 'sk' })
        return () => h('div')
      },
    })
    const Root = defineComponent({
      setup() {
        const item = createItem(sessionHandlers, { key: 'main' })
        useContextStorageItemProvider(item)
        return () => h(Leaf)
      },
    })
    mount(Root)
    expect(handle).toBeDefined()
    expect(typeof handle!.stop).toBe('function')
    expect(typeof handle!.reset).toBe('function')
    expect(handle!.wasChanged.value).toBe(false)
  })
})

describe('useContextStorageItemProvider', () => {
  it('provides handlers so descendants can inject them', () => {
    const item = createItem(sessionHandlers, { key: 'main' })
    let injectedItem: unknown
    const Leaf = defineComponent({
      setup() {
        injectedItem = inject(contextStorageCollectionItemInjectKey)
        return () => h('div')
      },
    })
    const Root = defineComponent({
      setup() {
        useContextStorageItemProvider(item)
        return () => h(Leaf)
      },
    })
    mount(Root)
    expect(injectedItem).toBe(item)
  })
})

describe('useContextStorageProvider', () => {
  it('throws when no collection is provided', () => {
    const warnHandler = vi.fn()
    const Comp = defineComponent({
      render: () => null,
      setup() {
        useContextStorageProvider('main')
      },
    })
    expect(() => mount(Comp, { global: { config: { warnHandler } } })).toThrow(
      /collection not found/,
    )
    expect(warnHandler.mock.calls[0]?.[0]).toContain('context-storage-collection')
  })

  it('adds an item on mount and removes it on unmount', () => {
    const collection = createCollectionManager(sessionHandlers)
    const Provider = defineComponent({
      setup() {
        useContextStorageProvider('main')
        return () => h('div')
      },
    })
    const wrapper = mount(Provider, {
      global: { provide: { [contextStorageCollectionInjectKey as symbol]: collection } },
    })
    expect(collection.findItemByKey('main')).toBeDefined()
    wrapper.unmount()
    expect(collection.findItemByKey('main')).toBeUndefined()
  })
})

describe('useContextStorageCollection', () => {
  it('creates a collection manager and provides it to descendants', () => {
    let returned: ReturnType<typeof useContextStorageCollection> | undefined
    let injected: unknown
    const Leaf = defineComponent({
      setup() {
        injected = inject(contextStorageCollectionInjectKey)
        return () => h('div')
      },
    })
    const Root = defineComponent({
      setup() {
        returned = useContextStorageCollection(sessionHandlers)
        return () => h(Leaf)
      },
    })
    mount(Root)
    expect(returned).toBeDefined()
    expect(typeof returned!.add).toBe('function')
    expect(injected).toBe(returned)
  })
})

describe('useContextStorageActivator', () => {
  it('activate() calls setActive with the injected item', () => {
    const item = createItem(sessionHandlers, { key: 'main' })
    const collection = createCollectionManager(sessionHandlers)
    const setActive = vi.spyOn(collection, 'setActive')

    const Comp = defineComponent({
      setup() {
        const { activate } = useContextStorageActivator()
        activate()
        return () => h('div')
      },
    })
    mount(Comp, {
      global: {
        provide: {
          [contextStorageCollectionInjectKey as symbol]: collection,
          [contextStorageCollectionItemInjectKey as symbol]: item,
        },
      },
    })
    expect(setActive).toHaveBeenCalledWith(item)
  })
})
