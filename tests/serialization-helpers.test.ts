import { describe, it, expect } from 'vitest'
import { serializeParams, deserializeParams } from '../src/handlers/query/helpers'
import { asObjectArray, asNumber, asString } from '../src/handlers/query/transform-helpers'

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

  describe('arrays of objects', () => {
    it('should serialize array of objects as indexed keys', () => {
      const result = serializeParams({
        items: [
          { product: 'Apple', quantity: 5 },
          { product: 'Banana', quantity: 10 },
        ],
      })
      expect(result).toEqual({
        'items[0][product]': 'Apple',
        'items[0][quantity]': '5',
        'items[1][product]': 'Banana',
        'items[1][quantity]': '10',
      })
    })

    it('should serialize array of objects with prefix', () => {
      const result = serializeParams(
        {
          items: [{ name: 'A' }, { name: 'B' }],
        },
        { prefix: 'data' },
      )
      expect(result).toEqual({
        'data[items][0][name]': 'A',
        'data[items][1][name]': 'B',
      })
    })

    it('should serialize single-item array of objects', () => {
      const result = serializeParams({
        items: [{ product: 'Apple', quantity: 1 }],
      })
      expect(result).toEqual({
        'items[0][product]': 'Apple',
        'items[0][quantity]': '1',
      })
    })

    it('should skip empty array of objects', () => {
      const result = serializeParams({ items: [], name: 'test' })
      expect(result).toEqual({ name: 'test' })
    })

    it('should handle nested objects inside array items', () => {
      const result = serializeParams({
        items: [{ meta: { color: 'red' } }],
      })
      expect(result).toEqual({
        'items[0][meta][color]': 'red',
      })
    })

    it('should handle boolean values inside array items', () => {
      const result = serializeParams({
        items: [{ name: 'A', active: true }],
      })
      expect(result).toEqual({
        'items[0][name]': 'A',
        'items[0][active]': '1',
      })
    })
  })

  describe('edge cases', () => {
    it('should preserve empty strings', () => {
      const result = serializeParams({ name: '', age: 30 })
      expect(result).toEqual({
        name: '',
        age: '30',
      })
    })

    it('should preserve null values', () => {
      const result = serializeParams({ name: null, age: 30 })
      expect(result).toEqual({
        name: null,
        age: '30',
      })
    })

    it('should skip undefined values', () => {
      const result = serializeParams({ name: undefined, age: 30 })
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

  it('should roundtrip array of objects via asObjectArray', () => {
    const original = {
      items: [
        { product: 'Apple', quantity: 5 },
        { product: 'Banana', quantity: 10 },
      ],
    }
    const serialized = serializeParams(original)
    const deserialized = deserializeParams(serialized)

    // deserializeParams returns indexed objects (keys are strings from URL)
    expect(deserialized).toEqual({
      items: {
        '0': { product: 'Apple', quantity: '5' },
        '1': { product: 'Banana', quantity: '10' },
      },
    })

    // asObjectArray converts indexed object back to a typed array
    const items = asObjectArray(deserialized.items, (entry) => ({
      product: asString(entry.product as string | null | undefined),
      quantity: asNumber(entry.quantity as string | number | null | undefined),
    }))

    expect(items).toEqual(original.items)
  })
})
