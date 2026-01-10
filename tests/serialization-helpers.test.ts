import { describe, it, expect } from 'vitest'
import { serializeParams, deserializeParams } from '../src/handlers/query/helpers'

describe('serializeParams', () => {
  describe('basic serialization', () => {
    it('should serialize simple values', () => {
      const result = serializeParams({ name: 'John', age: 30 })
      expect(result).toEqual({
        name: 'John',
        age: '30',
      })
    })

    it('should serialize boolean values', () => {
      const result = serializeParams({ active: true, archived: false })
      expect(result).toEqual({
        active: '1',
        archived: '0',
      })
    })

    it('should serialize arrays', () => {
      const result = serializeParams({ tags: ['a', 'b', 'c'] })
      expect(result).toEqual({
        tags: ['a', 'b', 'c'],
      })
    })

    it('should serialize number arrays', () => {
      const result = serializeParams({ ids: [1, 2, 3] })
      expect(result).toEqual({
        ids: ['1', '2', '3'],
      })
    })
  })

  describe('with prefix', () => {
    it('should add prefix to keys', () => {
      const result = serializeParams({ status: 'active' }, { prefix: 'filters' })
      expect(result).toEqual({
        'filters[status]': 'active',
      })
    })

    it('should add prefix to multiple keys', () => {
      const result = serializeParams({ page: 1, search: 'test' }, { prefix: 'query' })
      expect(result).toEqual({
        'query[page]': '1',
        'query[search]': 'test',
      })
    })

    it('should add prefix to arrays', () => {
      const result = serializeParams({ tags: ['a', 'b'] }, { prefix: 'filters' })
      expect(result).toEqual({
        'filters[tags]': ['a', 'b'],
      })
    })
  })

  describe('nested objects', () => {
    it('should serialize nested objects without prefix', () => {
      const result = serializeParams({
        user: {
          name: 'John',
          age: 30,
        },
      })
      expect(result).toEqual({
        'user[name]': 'John',
        'user[age]': '30',
      })
    })

    it('should serialize nested objects with prefix', () => {
      const result = serializeParams(
        {
          user: {
            name: 'John',
            active: true,
          },
        },
        { prefix: 'filters' },
      )
      expect(result).toEqual({
        'filters[user][name]': 'John',
        'filters[user][active]': '1',
      })
    })

    it('should serialize deeply nested objects', () => {
      const result = serializeParams({
        filters: {
          date: {
            from: '2024-01-01',
            to: '2024-12-31',
          },
        },
      })
      expect(result).toEqual({
        'filters[date][from]': '2024-01-01',
        'filters[date][to]': '2024-12-31',
      })
    })
  })

  describe('edge cases', () => {
    it('should skip empty strings', () => {
      const result = serializeParams({ name: '', age: 30 })
      expect(result).toEqual({
        age: '30',
      })
    })

    it('should skip null values', () => {
      const result = serializeParams({ name: null, age: 30 })
      expect(result).toEqual({
        age: '30',
      })
    })

    it('should skip empty arrays', () => {
      const result = serializeParams({ tags: [], name: 'test' })
      expect(result).toEqual({
        name: 'test',
      })
    })

    it('should handle empty object', () => {
      const result = serializeParams({})
      expect(result).toEqual({})
    })

    it('should handle zero values', () => {
      const result = serializeParams({ count: 0, page: 0 })
      expect(result).toEqual({
        count: '0',
        page: '0',
      })
    })

    it('should handle false boolean', () => {
      const result = serializeParams({ active: false })
      expect(result).toEqual({
        active: '0',
      })
    })
  })

  describe('complex scenarios', () => {
    it('should serialize mixed types', () => {
      const result = serializeParams(
        {
          search: 'test',
          page: 1,
          active: true,
          tags: ['a', 'b'],
          user: {
            name: 'John',
          },
        },
        { prefix: 'filters' },
      )
      expect(result).toEqual({
        'filters[search]': 'test',
        'filters[page]': '1',
        'filters[active]': '1',
        'filters[tags]': ['a', 'b'],
        'filters[user][name]': 'John',
      })
    })
  })
})

describe('deserializeParams', () => {
  describe('basic deserialization', () => {
    it('should deserialize simple key-value pairs', () => {
      const result = deserializeParams({ name: 'John', age: '30' })
      expect(result).toEqual({
        name: 'John',
        age: '30',
      })
    })

    it('should handle empty object', () => {
      const result = deserializeParams({})
      expect(result).toEqual({})
    })
  })

  describe('with brackets', () => {
    it('should deserialize single-level brackets', () => {
      const result = deserializeParams({
        'filters[status]': 'active',
        'filters[page]': '1',
      })
      expect(result).toEqual({
        filters: {
          status: 'active',
          page: '1',
        },
      })
    })

    it('should deserialize nested brackets', () => {
      const result = deserializeParams({
        'filters[user][name]': 'John',
        'filters[user][age]': '30',
      })
      expect(result).toEqual({
        filters: {
          user: {
            name: 'John',
            age: '30',
          },
        },
      })
    })

    it('should deserialize deeply nested brackets', () => {
      const result = deserializeParams({
        'filters[date][range][from]': '2024-01-01',
        'filters[date][range][to]': '2024-12-31',
      })
      expect(result).toEqual({
        filters: {
          date: {
            range: {
              from: '2024-01-01',
              to: '2024-12-31',
            },
          },
        },
      })
    })
  })

  describe('mixed formats', () => {
    it('should handle both bracketed and simple keys', () => {
      const result = deserializeParams({
        search: 'test',
        'filters[status]': 'active',
        page: '1',
      })
      expect(result).toEqual({
        search: 'test',
        filters: {
          status: 'active',
        },
        page: '1',
      })
    })

    it('should handle multiple root keys with brackets', () => {
      const result = deserializeParams({
        'filters[status]': 'active',
        'sort[by]': 'name',
        'sort[order]': 'asc',
      })
      expect(result).toEqual({
        filters: {
          status: 'active',
        },
        sort: {
          by: 'name',
          order: 'asc',
        },
      })
    })
  })

  describe('array values', () => {
    it('should preserve array values', () => {
      const result = deserializeParams({
        'filters[tags]': ['a', 'b', 'c'],
      })
      expect(result).toEqual({
        filters: {
          tags: ['a', 'b', 'c'],
        },
      })
    })

    it('should handle single-value arrays', () => {
      const result = deserializeParams({
        'filters[tag]': 'single',
      })
      expect(result).toEqual({
        filters: {
          tag: 'single',
        },
      })
    })
  })

  describe('edge cases', () => {
    it('should handle keys with special characters', () => {
      const result = deserializeParams({
        'filter[created_at]': '2024-01-01',
      })
      expect(result).toEqual({
        filter: {
          created_at: '2024-01-01',
        },
      })
    })

    it('should handle numeric string keys', () => {
      const result = deserializeParams({
        'items[0]': 'first',
        'items[1]': 'second',
      })
      expect(result).toEqual({
        items: {
          '0': 'first',
          '1': 'second',
        },
      })
    })
  })
})

describe('serializeParams and deserializeParams roundtrip', () => {
  it('should maintain data integrity for simple objects', () => {
    const original = { name: 'John', age: 30, active: true }
    const serialized = serializeParams(original)
    const deserialized = deserializeParams(serialized)

    // Note: numbers become strings after roundtrip
    expect(deserialized).toEqual({
      name: 'John',
      age: '30',
      active: '1',
    })
  })

  it('should maintain data integrity with prefix', () => {
    const original = { status: 'active', page: 1 }
    const serialized = serializeParams(original, { prefix: 'filters' })
    const deserialized = deserializeParams(serialized)

    expect(deserialized).toEqual({
      filters: {
        status: 'active',
        page: '1',
      },
    })
  })

  it('should maintain data integrity for nested objects', () => {
    const original = {
      user: {
        name: 'John',
        settings: {
          theme: 'dark',
        },
      },
    }
    const serialized = serializeParams(original)
    const deserialized = deserializeParams(serialized)

    expect(deserialized).toEqual(original)
  })

  it('should maintain array data', () => {
    const original = { tags: ['a', 'b', 'c'] }
    const serialized = serializeParams(original, { prefix: 'filters' })
    const deserialized = deserializeParams(serialized)

    expect(deserialized).toEqual({
      filters: {
        tags: ['a', 'b', 'c'],
      },
    })
  })
})
