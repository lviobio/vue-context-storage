import { describe, it, expect } from 'vitest'
import {
  computeSyncState,
  type ComputeSyncStateInput,
} from '../src/handlers/query/compute-sync-state'

function createInput<T extends Record<string, unknown>>(
  overrides: Partial<ComputeSyncStateInput<T>> & {
    deserializedState: Record<string, unknown>
    itemState: T
    initialData: T
  },
): ComputeSyncStateInput<T> {
  return {
    prefix: undefined,
    onlyChanges: false,
    emptyPlaceholder: '_',
    ...overrides,
  }
}

describe('computeSyncState', () => {
  describe('prefix extraction', () => {
    it('should extract state by prefix', () => {
      const result = computeSyncState(
        createInput({
          deserializedState: { filters: { search: 'test' } },
          itemState: { search: '' },
          initialData: { search: '' },
          prefix: 'filters',
        }),
      )

      expect(result).toEqual({ type: 'sync', data: { search: 'test' } })
    })

    it('should return none when prefix key is undefined', () => {
      const result = computeSyncState(
        createInput({
          deserializedState: { other: { search: 'test' } },
          itemState: { search: '' },
          initialData: { search: '' },
          prefix: 'filters',
        }),
      )

      expect(result).toEqual({ type: 'none' })
    })

    it('should return none when prefix key is null (e.g. /?filters)', () => {
      const result = computeSyncState(
        createInput({
          deserializedState: { filters: null },
          itemState: { search: '' },
          initialData: { search: '' },
          prefix: 'filters',
        }),
      )

      expect(result).toEqual({ type: 'none' })
    })

    it('should use full state when no prefix', () => {
      const result = computeSyncState(
        createInput({
          deserializedState: { search: 'test', page: '2' },
          itemState: { search: '', page: '1' },
          initialData: { search: '', page: '1' },
        }),
      )

      expect(result).toEqual({
        type: 'sync',
        data: { search: 'test', page: '2' },
      })
    })

    it('should use full state when prefix is empty string', () => {
      const result = computeSyncState(
        createInput({
          deserializedState: { search: 'test' },
          itemState: { search: '' },
          initialData: { search: '' },
          prefix: '',
        }),
      )

      expect(result).toEqual({ type: 'sync', data: { search: 'test' } })
    })
  })

  describe('empty state handling', () => {
    it('should return reset with initialData when deserialized state is empty object', () => {
      const initialData = { search: 'default', page: 1 }

      const result = computeSyncState(
        createInput({
          deserializedState: {},
          itemState: { search: 'current', page: 5 },
          initialData,
        }),
      )

      expect(result).toEqual({ type: 'reset', data: initialData })
    })

    it('should return reset when prefix extracts empty object', () => {
      const initialData = { search: '' }

      const result = computeSyncState(
        createInput({
          deserializedState: { filters: {} },
          itemState: { search: 'current' },
          initialData,
          prefix: 'filters',
        }),
      )

      expect(result).toEqual({ type: 'reset', data: initialData })
    })
  })

  describe('empty placeholder handling', () => {
    it('should remove empty placeholder and return sync with empty data', () => {
      const result = computeSyncState(
        createInput({
          deserializedState: { _: null },
          itemState: { search: 'test' },
          initialData: { search: '' },
          emptyPlaceholder: '_',
        }),
      )

      expect(result).toEqual({ type: 'sync', data: {} })
    })

    it('should handle custom empty placeholder', () => {
      const result = computeSyncState(
        createInput({
          deserializedState: { empty: null },
          itemState: { search: 'test' },
          initialData: { search: '' },
          emptyPlaceholder: 'empty',
        }),
      )

      expect(result).toEqual({ type: 'sync', data: {} })
    })

    it('should not treat placeholder if it has a non-null value', () => {
      const result = computeSyncState(
        createInput({
          deserializedState: { _: 'something' },
          itemState: { _: '' },
          initialData: { _: '' },
          emptyPlaceholder: '_',
        }),
      )

      expect(result).toEqual({ type: 'sync', data: { _: 'something' } })
    })

    it('should not treat placeholder if there are multiple keys', () => {
      const result = computeSyncState(
        createInput({
          deserializedState: { _: null, search: 'test' },
          itemState: { search: '' },
          initialData: { search: '' },
          emptyPlaceholder: '_',
        }),
      )

      expect(result.type).toBe('sync')
      expect((result as any).data).toHaveProperty('_')
      expect((result as any).data).toHaveProperty('search')
    })

    it('should remove empty placeholder with prefix', () => {
      const result = computeSyncState(
        createInput({
          deserializedState: { filters: { _: null } },
          itemState: { search: '' },
          initialData: { search: '' },
          prefix: 'filters',
          emptyPlaceholder: '_',
        }),
      )

      expect(result).toEqual({ type: 'sync', data: {} })
    })
  })

  describe('onlyChanges', () => {
    it('should merge non-URL keys from itemState when onlyChanges is true', () => {
      const result = computeSyncState(
        createInput({
          deserializedState: { search: 'hello' },
          itemState: { search: 'old', page: 5, status: 'active' },
          initialData: { search: '', page: 1, status: 'active' },
          onlyChanges: true,
        }),
      )

      expect(result).toEqual({
        type: 'sync',
        data: { search: 'hello', page: 5, status: 'active' },
      })
    })

    it('should not merge itemState keys when onlyChanges is false', () => {
      const result = computeSyncState(
        createInput({
          deserializedState: { search: 'hello' },
          itemState: { search: 'old', page: 5, status: 'active' },
          initialData: { search: '', page: 1, status: 'active' },
          onlyChanges: false,
        }),
      )

      expect(result).toEqual({
        type: 'sync',
        data: { search: 'hello' },
      })
    })

    it('should not merge itemState keys when wasEmptyState is true', () => {
      const result = computeSyncState(
        createInput({
          deserializedState: { _: null },
          itemState: { search: 'current', page: 5 },
          initialData: { search: '', page: 1 },
          onlyChanges: true,
          emptyPlaceholder: '_',
        }),
      )

      // Empty placeholder was removed, wasEmptyState=true, so onlyChanges merge is skipped
      expect(result).toEqual({ type: 'sync', data: {} })
    })

    it('should keep URL keys and add missing keys from itemState', () => {
      const result = computeSyncState(
        createInput({
          deserializedState: { page: '3' },
          itemState: { page: 1, search: 'test', tags: ['a', 'b'] },
          initialData: { page: 1, search: '', tags: [] as string[] },
          onlyChanges: true,
        }),
      )

      expect(result.type).toBe('sync')
      const data = (result as any).data
      // URL key 'page' should have the URL value
      expect(data.page).toBe('3')
      // Non-URL keys should come from itemState
      expect(data.search).toBe('test')
      expect(data.tags).toEqual(['a', 'b'])
    })

    it('should work with prefix and onlyChanges', () => {
      const result = computeSyncState(
        createInput({
          deserializedState: { filters: { search: 'hello' } },
          itemState: { search: 'old', page: 5 },
          initialData: { search: '', page: 1 },
          prefix: 'filters',
          onlyChanges: true,
        }),
      )

      expect(result).toEqual({
        type: 'sync',
        data: { search: 'hello', page: 5 },
      })
    })
  })

  describe('does not mutate inputs', () => {
    it('should not mutate deserializedState', () => {
      const deserializedState = { search: 'test', _: null }
      const original = { ...deserializedState }

      computeSyncState(
        createInput({
          deserializedState,
          itemState: { search: '' },
          initialData: { search: '' },
        }),
      )

      expect(deserializedState).toEqual(original)
    })

    it('should not mutate itemState', () => {
      const itemState = { search: 'current', page: 5 }
      const original = { ...itemState }

      computeSyncState(
        createInput({
          deserializedState: { search: 'new' },
          itemState,
          initialData: { search: '', page: 1 },
          onlyChanges: true,
        }),
      )

      expect(itemState).toEqual(original)
    })

    it('should not mutate initialData', () => {
      const initialData = { search: 'default' }
      const original = { ...initialData }

      computeSyncState(
        createInput({
          deserializedState: {},
          itemState: { search: 'current' },
          initialData,
        }),
      )

      expect(initialData).toEqual(original)
    })
  })

  describe('edge cases', () => {
    it('should handle nested objects in deserialized state', () => {
      const result = computeSyncState(
        createInput({
          deserializedState: {
            filters: { price: { min: '0', max: '100' } },
          },
          itemState: { price: { min: 0, max: 1000 } },
          initialData: { price: { min: 0, max: 1000 } },
          prefix: 'filters',
        }),
      )

      expect(result.type).toBe('sync')
      expect((result as any).data).toEqual({ price: { min: '0', max: '100' } })
    })

    it('should handle single key deserialized state', () => {
      const result = computeSyncState(
        createInput({
          deserializedState: { search: 'test' },
          itemState: { search: '' },
          initialData: { search: '' },
        }),
      )

      expect(result).toEqual({ type: 'sync', data: { search: 'test' } })
    })

    it('should distinguish empty placeholder null from other nulls', () => {
      // A key with null that is NOT the emptyPlaceholder
      const result = computeSyncState(
        createInput({
          deserializedState: { search: null },
          itemState: { search: '' },
          initialData: { search: '' },
          emptyPlaceholder: '_',
        }),
      )

      // 'search' is not the empty placeholder, so it should pass through as sync
      expect(result.type).toBe('sync')
      expect((result as any).data).toEqual({ search: null })
    })
  })
})
