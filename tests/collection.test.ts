import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CollectionManager } from '../src/collection'
import type { ContextStorageHandler, ContextStorageHandlerConstructor } from '../src/handlers'

// Mock handler for testing
class MockHandler implements ContextStorageHandler {
  setEnabledCalls: Array<{ state: boolean; initial: boolean }> = []

  register() {
    return () => {}
  }

  getInjectionKey() {
    return Symbol('mock-handler')
  }

  setEnabled(state: boolean, initial: boolean) {
    this.setEnabledCalls.push({ state, initial })
  }
}

// Mock handler constructor
const MockHandlerConstructor = MockHandler as unknown as ContextStorageHandlerConstructor

describe('CollectionManager', () => {
  let collection: CollectionManager

  beforeEach(() => {
    collection = new CollectionManager([MockHandlerConstructor])
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
      expect(item.handlers[0]).toBeInstanceOf(MockHandler)
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
      expect(item1.handlers[0]).toBeInstanceOf(MockHandler)
      expect(item2.handlers[0]).toBeInstanceOf(MockHandler)
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
      const otherCollection = new CollectionManager([MockHandlerConstructor])
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

      const handler1 = item1.handlers[0] as MockHandler
      const handler2 = item2.handlers[0] as MockHandler

      expect(handler1.setEnabledCalls).toHaveLength(1)
      expect(handler1.setEnabledCalls[0]).toEqual({ state: true, initial: true })

      expect(handler2.setEnabledCalls).toHaveLength(1)
      expect(handler2.setEnabledCalls[0]).toEqual({ state: false, initial: true })
    })

    it('should call setEnabled on handlers when switching active item', () => {
      const item1 = collection.add({ key: 'test-1' })
      const item2 = collection.add({ key: 'test-2' })

      collection.setActive(item1)

      const handler1 = item1.handlers[0] as MockHandler
      const handler2 = item2.handlers[0] as MockHandler

      // Clear previous calls
      handler1.setEnabledCalls = []
      handler2.setEnabledCalls = []

      collection.setActive(item2)

      expect(handler1.setEnabledCalls).toHaveLength(1)
      expect(handler1.setEnabledCalls[0]).toEqual({ state: false, initial: false })

      expect(handler2.setEnabledCalls).toHaveLength(1)
      expect(handler2.setEnabledCalls[0]).toEqual({ state: true, initial: false })
    })

    it('should not call handlers if setting same active item', () => {
      const item = collection.add({ key: 'test-1' })

      collection.setActive(item)

      const handler = item.handlers[0] as MockHandler
      handler.setEnabledCalls = []

      collection.setActive(item)

      expect(handler.setEnabledCalls).toHaveLength(0)
    })

    it('should work with handlers that do not implement setEnabled', () => {
      class HandlerWithoutSetEnabled implements ContextStorageHandler {
        register() {
          return () => {}
        }
        getInjectionKey() {
          return Symbol('handler')
        }
      }

      const collection = new CollectionManager([
        HandlerWithoutSetEnabled as unknown as ContextStorageHandlerConstructor,
      ])
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

      const handler1 = item1.handlers[0] as MockHandler
      const handler2 = item2.handlers[0] as MockHandler

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
