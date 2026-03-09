import { describe, it, expect } from 'vitest'
import {
  computeSyncState,
  type ComputeSyncStateInput,
} from '../src/handlers/query/compute-sync-state'

function createInput<T extends Record<string, unknown>>(
  overrides: Partial<ComputeSyncStateInput<T>> & {
    deserializedState: Record<string, unknown>
    initialData: T
  },
): ComputeSyncStateInput<T> {
  return {
    key: undefined,
    emptyPlaceholder: '_',
    ...overrides,
  }
}

describe('computeSyncState', () => {
  describe('key extraction', () => {
    it('should extract state by key', () => {
      const result = computeSyncState(
        createInput({
          deserializedState: { filters: { search: 'test' } },
          initialData: { search: '' },
          key: 'filters',
        }),
      )

      expect(result).toEqual({ type: 'sync', data: { search: 'test' } })
    })

    it('should return none when key is undefined in state', () => {
      const result = computeSyncState(
        createInput({
          deserializedState: { other: { search: 'test' } },
          initialData: { search: '' },
          key: 'filters',
        }),
      )

      expect(result).toEqual({ type: 'none' })
    })

    it('should return none when key is null (e.g. /?filters)', () => {
      const result = computeSyncState(
        createInput({
          deserializedState: { filters: null },
          initialData: { search: '' },
          key: 'filters',
        }),
      )

      expect(result).toEqual({ type: 'none' })
    })

    it('should use full state when no key', () => {
      const result = computeSyncState(
        createInput({
          deserializedState: { search: 'test', page: '2' },
          initialData: { search: '', page: '1' },
        }),
      )

      expect(result).toEqual({
        type: 'sync',
        data: { search: 'test', page: '2' },
      })
    })

    it('should use full state when key is empty string', () => {
      const result = computeSyncState(
        createInput({
          deserializedState: { search: 'test' },
          initialData: { search: '' },
          key: '',
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
          initialData,
        }),
      )

      expect(result).toEqual({ type: 'reset', data: initialData })
    })

    it('should return reset when key extracts empty object', () => {
      const initialData = { search: '' }

      const result = computeSyncState(
        createInput({
          deserializedState: { filters: {} },
          initialData,
          key: 'filters',
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
          initialData: { search: '' },
          emptyPlaceholder: '_',
        }),
      )

      expect(result.type).toBe('sync')
      expect((result as any).data).toHaveProperty('_')
      expect((result as any).data).toHaveProperty('search')
    })

    it('should remove empty placeholder with key', () => {
      const result = computeSyncState(
        createInput({
          deserializedState: { filters: { _: null } },
          initialData: { search: '' },
          key: 'filters',
          emptyPlaceholder: '_',
        }),
      )

      expect(result).toEqual({ type: 'sync', data: {} })
    })
  })

  describe('URL-only data (no itemState merge)', () => {
    it('should return only URL-deserialized keys without merging itemState', () => {
      const result = computeSyncState(
        createInput({
          deserializedState: { search: 'hello' },
          initialData: { search: '', page: 1, status: 'active' },
        }),
      )

      expect(result).toEqual({
        type: 'sync',
        data: { search: 'hello' },
      })
    })

    it('should return only URL key even with key option', () => {
      const result = computeSyncState(
        createInput({
          deserializedState: { filters: { search: 'hello' } },
          initialData: { search: '', page: 1 },
          key: 'filters',
        }),
      )

      expect(result).toEqual({
        type: 'sync',
        data: { search: 'hello' },
      })
    })
  })

  describe('unkeyed items with no overlapping URL keys', () => {
    it('should return reset when URL has only unrelated keys', () => {
      const initialData = { name: 'John', search: '' }

      const result = computeSyncState(
        createInput({
          deserializedState: { foo: 'bar' },
          initialData,
        }),
      )

      expect(result).toEqual({ type: 'reset', data: initialData })
    })

    it('should return reset when URL has multiple unrelated keys', () => {
      const initialData = { name: 'John', page: 1 }

      const result = computeSyncState(
        createInput({
          deserializedState: { foo: 'bar', baz: 'qux' },
          initialData,
        }),
      )

      expect(result).toEqual({ type: 'reset', data: initialData })
    })

    it('should return sync when at least one URL key overlaps with initialData', () => {
      const result = computeSyncState(
        createInput({
          deserializedState: { foo: 'bar', name: 'Jane' },
          initialData: { name: 'John', search: '' },
        }),
      )

      expect(result).toEqual({
        type: 'sync',
        data: { foo: 'bar', name: 'Jane' },
      })
    })

    it('should not apply overlap check to keyed items', () => {
      const result = computeSyncState(
        createInput({
          deserializedState: { filters: { foo: 'bar' } },
          initialData: { name: 'John' },
          key: 'filters',
        }),
      )

      // Keyed items extract state by key; overlap check does not apply
      expect(result).toEqual({ type: 'sync', data: { foo: 'bar' } })
    })

    it('should not interfere with empty placeholder handling', () => {
      const result = computeSyncState(
        createInput({
          deserializedState: { _: null },
          initialData: { search: '' },
          emptyPlaceholder: '_',
        }),
      )

      // After placeholder removal state is empty — should return sync with empty data
      expect(result).toEqual({ type: 'sync', data: {} })
    })
  })

  describe('does not mutate inputs', () => {
    it('should not mutate deserializedState', () => {
      const deserializedState = { search: 'test', _: null }
      const original = { ...deserializedState }

      computeSyncState(
        createInput({
          deserializedState,
          initialData: { search: '' },
        }),
      )

      expect(deserializedState).toEqual(original)
    })

    it('should not mutate initialData', () => {
      const initialData = { search: 'default' }
      const original = { ...initialData }

      computeSyncState(
        createInput({
          deserializedState: {},
          initialData,
        }),
      )

      expect(initialData).toEqual(original)
    })
  })

  describe('nested bracket keys', () => {
    it('should traverse nested objects with bracket key', () => {
      const result = computeSyncState(
        createInput({
          deserializedState: { tables: { first: { search: 'test' } } },
          initialData: { search: '' },
          key: 'tables[first]',
        }),
      )

      expect(result).toEqual({ type: 'sync', data: { search: 'test' } })
    })

    it('should traverse deeply nested bracket key', () => {
      const result = computeSyncState(
        createInput({
          deserializedState: { a: { b: { c: { page: '2' } } } },
          initialData: { page: '1' },
          key: 'a[b][c]',
        }),
      )

      expect(result).toEqual({ type: 'sync', data: { page: '2' } })
    })

    it('should return none when nested bracket path is missing', () => {
      const result = computeSyncState(
        createInput({
          deserializedState: { tables: { second: { search: 'test' } } },
          initialData: { search: '' },
          key: 'tables[first]',
        }),
      )

      expect(result).toEqual({ type: 'none' })
    })

    it('should return none when intermediate bracket path is missing', () => {
      const result = computeSyncState(
        createInput({
          deserializedState: { other: {} },
          initialData: { search: '' },
          key: 'tables[first]',
        }),
      )

      expect(result).toEqual({ type: 'none' })
    })

    it('should return reset when nested bracket key extracts empty object', () => {
      const initialData = { search: '' }

      const result = computeSyncState(
        createInput({
          deserializedState: { tables: { first: {} } },
          initialData,
          key: 'tables[first]',
        }),
      )

      expect(result).toEqual({ type: 'reset', data: initialData })
    })

    it('should handle bracket key with empty placeholder', () => {
      const result = computeSyncState(
        createInput({
          deserializedState: { tables: { first: { _: null } } },
          initialData: { search: '' },
          key: 'tables[first]',
          emptyPlaceholder: '_',
        }),
      )

      expect(result).toEqual({ type: 'sync', data: {} })
    })
  })

  describe('edge cases', () => {
    it('should handle nested objects in deserialized state', () => {
      const result = computeSyncState(
        createInput({
          deserializedState: {
            filters: { price: { min: '0', max: '100' } },
          },
          initialData: { price: { min: 0, max: 1000 } },
          key: 'filters',
        }),
      )

      expect(result.type).toBe('sync')
      expect((result as any).data).toEqual({ price: { min: '0', max: '100' } })
    })

    it('should handle single key deserialized state', () => {
      const result = computeSyncState(
        createInput({
          deserializedState: { search: 'test' },
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
