import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createCollectionManager, createItem, type CollectionManager } from '../../src/collection'
import type { ContextStorageHandler, ContextStorageHandlerFactory } from '../../src'

// Mock handler for testing
interface MockHandler extends ContextStorageHandler<any, any> {
  setEnabledCalls: Array<{ state: boolean; initial: boolean }>
}

function createMockHandlerFactory(): ContextStorageHandlerFactory {
  const factory: ContextStorageHandlerFactory = () => {
    const setEnabledCalls: Array<{ state: boolean; initial: boolean }> = []

    return {
      register() {
        return {
          stop: () => {},
          reset: () => {},
          wasChanged: { value: false } as any,
        }
      },

      getInjectionKey() {
        return Symbol('mock-handler')
      },

      setEnabled(state: boolean, initial: boolean) {
        setEnabledCalls.push({ state, initial })
      },

      get setEnabledCalls() {
        return setEnabledCalls
      },
    } as MockHandler
  }

  return factory
}

const sharedKeyA = Symbol('handler-a')
const sharedKeyB = Symbol('handler-b')

function createMockHandlerFactoryWithKey(
  injectionKey: symbol,
  label?: string,
): ContextStorageHandlerFactory {
  const factory: ContextStorageHandlerFactory = () => ({
    register() {
      return {
        stop: () => {},
        reset: () => {},
        wasChanged: { value: false } as any,
      }
    },
    getInjectionKey() {
      return injectionKey
    },
    label,
  })
  return factory
}

describe('createItem', () => {
  it('should deduplicate handlers by injection key, keeping the last one', () => {
    const factory1 = createMockHandlerFactoryWithKey(sharedKeyA, 'first')
    const factory2 = createMockHandlerFactoryWithKey(sharedKeyB, 'other')
    const factory3 = createMockHandlerFactoryWithKey(sharedKeyA, 'override')

    const item = createItem([factory1, factory2, factory3], { key: 'test' })

    expect(item.handlers).toHaveLength(2)
    // The override (last) handler for keyA should win
    const handlerA = item.handlers.find((h) => h.getInjectionKey() === sharedKeyA) as any
    expect(handlerA.label).toBe('override')
    // keyB handler is kept
    const handlerB = item.handlers.find((h) => h.getInjectionKey() === sharedKeyB) as any
    expect(handlerB.label).toBe('other')
  })

  it('should keep all handlers when injection keys are unique', () => {
    const factory1 = createMockHandlerFactoryWithKey(sharedKeyA)
    const factory2 = createMockHandlerFactoryWithKey(sharedKeyB)

    const item = createItem([factory1, factory2], { key: 'test' })

    expect(item.handlers).toHaveLength(2)
  })

  it('should handle single factory', () => {
    const factory = createMockHandlerFactoryWithKey(sharedKeyA)

    const item = createItem([factory], { key: 'test' })

    expect(item.handlers).toHaveLength(1)
  })

  it('should handle empty factories array', () => {
    const item = createItem([], { key: 'test' })

    expect(item.handlers).toHaveLength(0)
  })
})

describe('createCollectionManager', () => {
  let collection: CollectionManager

  beforeEach(() => {
    collection = createCollectionManager([createMockHandlerFactory()])
  })

  describe('initialization', () => {
    it('should create an empty collection', () => {
      expect(collection.active).toBeUndefined()
      expect(collection.first()).toBeUndefined()
    })

    it('should not be ready initially', async () => {
      const readyPromise = collection.isReady()
      expect(readyPromise).toBeInstanceOf(Promise)

      // Should not resolve immediately
      let resolved = false
      readyPromise.then(() => {
        resolved = true
      })

      await new Promise((resolve) => setTimeout(resolve, 10))
      expect(resolved).toBe(false)
    })

    it('should become ready when markAsReady is called', async () => {
      const readyPromise = collection.isReady()

      collection.markAsReady()

      await expect(readyPromise).resolves.toBeUndefined()
    })
  })

  describe('add', () => {
    it('should add item to collection', () => {
      const item = collection.add({ key: 'test-1' })

      expect(item).toBeDefined()
      expect(item.key).toBe('test-1')
      expect(item.handlers).toHaveLength(1)
      expect(item.handlers[0]).toHaveProperty('register')
      expect(item.handlers[0]).toHaveProperty('getInjectionKey')
    })

    it('should add multiple items', () => {
      const item1 = collection.add({ key: 'test-1' })
      const item2 = collection.add({ key: 'test-2' })

      expect(collection.first()).toBe(item1)
      expect(collection.findItemByKey('test-1')).toBe(item1)
      expect(collection.findItemByKey('test-2')).toBe(item2)
    })

    it('should create new handler instances for each item', () => {
      const item1 = collection.add({ key: 'test-1' })
      const item2 = collection.add({ key: 'test-2' })

      expect(item1.handlers[0]).not.toBe(item2.handlers[0])
      expect(item1.handlers[0]).toHaveProperty('register')
      expect(item2.handlers[0]).toHaveProperty('register')
    })
  })

  describe('findItemByKey', () => {
    it('should find item by key', () => {
      const item = collection.add({ key: 'test-1' })

      expect(collection.findItemByKey('test-1')).toBe(item)
    })

    it('should return undefined for non-existent key', () => {
      collection.add({ key: 'test-1' })

      expect(collection.findItemByKey('non-existent')).toBeUndefined()
    })
  })

  describe('first', () => {
    it('should return first item', () => {
      const item1 = collection.add({ key: 'test-1' })
      collection.add({ key: 'test-2' })

      expect(collection.first()).toBe(item1)
    })

    it('should return undefined for empty collection', () => {
      expect(collection.first()).toBeUndefined()
    })
  })

  describe('remove', () => {
    it('should remove item from collection', () => {
      const item = collection.add({ key: 'test-1' })

      collection.remove(item)

      expect(collection.findItemByKey('test-1')).toBeUndefined()
      expect(collection.first()).toBeUndefined()
    })

    it('should throw error when removing non-existent item', () => {
      collection.add({ key: 'test-1' })
      const otherCollection = createCollectionManager([createMockHandlerFactory()])
      const item2 = otherCollection.add({ key: 'test-2' })

      expect(() => collection.remove(item2)).toThrow('[vue-context-storage] Item not found')
    })

    it('should set new active when removing active item', () => {
      const item1 = collection.add({ key: 'test-1' })
      const item2 = collection.add({ key: 'test-2' })

      collection.setActive(item1)
      expect(collection.active).toBe(item1)

      collection.remove(item1)

      expect(collection.active).toBe(item2)
    })

    it('should not change active when removing non-active item', () => {
      const item1 = collection.add({ key: 'test-1' })
      const item2 = collection.add({ key: 'test-2' })

      collection.setActive(item1)
      collection.remove(item2)

      expect(collection.active).toBe(item1)
    })
  })

  describe('setActive', () => {
    it('should set active item', () => {
      const item = collection.add({ key: 'test-1' })

      collection.setActive(item)

      expect(collection.active).toBe(item)
    })

    it('should call setEnabled on handlers when setting active for the first time', () => {
      const item1 = collection.add({ key: 'test-1' })
      const item2 = collection.add({ key: 'test-2' })

      collection.setActive(item1)

      const handler1 = item1.handlers[0] as unknown as MockHandler
      const handler2 = item2.handlers[0] as unknown as MockHandler

      expect(handler1.setEnabledCalls).toHaveLength(1)
      expect(handler1.setEnabledCalls[0]).toEqual({ state: true, initial: true })

      expect(handler2.setEnabledCalls).toHaveLength(1)
      expect(handler2.setEnabledCalls[0]).toEqual({ state: false, initial: true })
    })

    it('should call setEnabled on handlers when switching active item', () => {
      const item1 = collection.add({ key: 'test-1' })
      const item2 = collection.add({ key: 'test-2' })

      collection.setActive(item1)

      const handler1 = item1.handlers[0] as unknown as MockHandler
      const handler2 = item2.handlers[0] as unknown as MockHandler

      // Clear previous calls
      handler1.setEnabledCalls.length = 0
      handler2.setEnabledCalls.length = 0

      collection.setActive(item2)

      expect(handler1.setEnabledCalls).toHaveLength(1)
      expect(handler1.setEnabledCalls[0]).toEqual({ state: false, initial: false })

      expect(handler2.setEnabledCalls).toHaveLength(1)
      expect(handler2.setEnabledCalls[0]).toEqual({ state: true, initial: false })
    })

    it('should not call handlers if setting same active item', () => {
      const item = collection.add({ key: 'test-1' })

      collection.setActive(item)

      const handler = item.handlers[0] as unknown as MockHandler
      handler.setEnabledCalls.length = 0

      collection.setActive(item)

      expect(handler.setEnabledCalls).toHaveLength(0)
    })

    it('should work with handlers that do not implement setEnabled', () => {
      const factoryWithoutSetEnabled: ContextStorageHandlerFactory = () => ({
        register() {
          return {
            stop: () => {},
            reset: () => {},
            wasChanged: { value: false } as any,
          }
        },
        getInjectionKey() {
          return Symbol('handler')
        },
      })

      const collection = createCollectionManager([factoryWithoutSetEnabled])
      const item = collection.add({ key: 'test' })

      expect(() => collection.setActive(item)).not.toThrow()
    })
  })

  describe('onActiveChange', () => {
    it('should call callback when active changes', () => {
      const callback = vi.fn()
      collection.onActiveChange(callback)

      const item = collection.add({ key: 'test-1' })
      collection.setActive(item)

      expect(callback).toHaveBeenCalledWith(item)
      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('should call multiple callbacks', () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()

      collection.onActiveChange(callback1)
      collection.onActiveChange(callback2)

      const item = collection.add({ key: 'test-1' })
      collection.setActive(item)

      expect(callback1).toHaveBeenCalledWith(item)
      expect(callback2).toHaveBeenCalledWith(item)
    })

    it('should not call callbacks if active does not change', () => {
      const callback = vi.fn()
      collection.onActiveChange(callback)

      const item = collection.add({ key: 'test-1' })
      collection.setActive(item)

      callback.mockClear()

      collection.setActive(item)

      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('complex scenarios', () => {
    it('should handle multiple items and activations', () => {
      const item1 = collection.add({ key: 'page-1' })
      const item2 = collection.add({ key: 'page-2' })
      const item3 = collection.add({ key: 'page-3' })

      collection.setActive(item1)
      expect(collection.active).toBe(item1)

      collection.setActive(item2)
      expect(collection.active).toBe(item2)

      collection.setActive(item3)
      expect(collection.active).toBe(item3)

      collection.remove(item3)
      expect(collection.active).toBe(item2)
    })

    it('should maintain handler state across multiple activations', () => {
      const item1 = collection.add({ key: 'test-1' })
      const item2 = collection.add({ key: 'test-2' })

      collection.setActive(item1)
      collection.setActive(item2)
      collection.setActive(item1)

      const handler1 = item1.handlers[0] as unknown as MockHandler
      const handler2 = item2.handlers[0] as unknown as MockHandler

      // item1: enabled(true,true) -> disabled(false,false) -> enabled(true,false)
      expect(handler1.setEnabledCalls).toHaveLength(3)
      expect(handler1.setEnabledCalls[0]).toEqual({ state: true, initial: true })
      expect(handler1.setEnabledCalls[1]).toEqual({ state: false, initial: false })
      expect(handler1.setEnabledCalls[2]).toEqual({ state: true, initial: false })

      // item2: disabled(false,true) -> enabled(true,false) -> disabled(false,false)
      expect(handler2.setEnabledCalls).toHaveLength(3)
      expect(handler2.setEnabledCalls[0]).toEqual({ state: false, initial: true })
      expect(handler2.setEnabledCalls[1]).toEqual({ state: true, initial: false })
      expect(handler2.setEnabledCalls[2]).toEqual({ state: false, initial: false })
    })
  })
})
