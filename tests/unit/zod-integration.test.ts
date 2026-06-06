import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { zObjectArray, createEmptyObject, SCHEMA_SYMBOL } from '../../src/zod'
import { serializeParams, deserializeParams } from '../../src/handlers/query/helpers'

describe('zObjectArray', () => {
  const ItemSchema = z.object({
    product: z.string().default(''),
    quantity: z.coerce.number().default(0),
  })

  describe('basic usage', () => {
    it('should convert indexed object to sorted array', () => {
      const Schema = z.object({
        items: zObjectArray(ItemSchema),
      })

      const result = Schema.safeParse({
        items: {
          '0': { product: 'Apple', quantity: '5' },
          '1': { product: 'Banana', quantity: '10' },
        },
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.items).toEqual([
          { product: 'Apple', quantity: 5 },
          { product: 'Banana', quantity: 10 },
        ])
      }
    })

    it('should sort entries by numeric key', () => {
      const Schema = z.object({
        items: zObjectArray(ItemSchema),
      })

      const result = Schema.safeParse({
        items: {
          '2': { product: 'C', quantity: '3' },
          '0': { product: 'A', quantity: '1' },
          '1': { product: 'B', quantity: '2' },
        },
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.items).toEqual([
          { product: 'A', quantity: 1 },
          { product: 'B', quantity: 2 },
          { product: 'C', quantity: 3 },
        ])
      }
    })

    it('should default to empty array when items is undefined', () => {
      const Schema = z.object({
        items: zObjectArray(ItemSchema),
      })

      const result = Schema.safeParse({})

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.items).toEqual([])
      }
    })

    it('should apply item schema defaults', () => {
      const Schema = z.object({
        items: zObjectArray(ItemSchema),
      })

      const result = Schema.safeParse({
        items: { '0': {} },
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.items).toEqual([{ product: '', quantity: 0 }])
      }
    })
  })

  describe('roundtrip with serialization', () => {
    it('should roundtrip through serialize → deserialize → zObjectArray', () => {
      const Schema = z.object({
        title: z.string().default(''),
        items: zObjectArray(ItemSchema),
      })

      const original = {
        title: 'Order',
        items: [
          { product: 'Apple', quantity: 5 },
          { product: 'Banana', quantity: 10 },
        ],
      }

      const serialized = serializeParams(original)
      const deserialized = deserializeParams(serialized)
      const result = Schema.safeParse(deserialized)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(original)
      }
    })

    it('should handle empty items in roundtrip', () => {
      const Schema = z.object({
        title: z.string().default(''),
        items: zObjectArray(ItemSchema),
      })

      const original = { title: 'Empty', items: [] as { product: string; quantity: number }[] }

      const serialized = serializeParams(original)
      const deserialized = deserializeParams(serialized)
      const result = Schema.safeParse(deserialized)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(original)
      }
    })
  })
})

describe('Zod Schema Integration', () => {
  describe('basic schemas', () => {
    it('should validate simple object schema', () => {
      const Schema = z.object({
        search: z.string().default(''),
        page: z.coerce.number().default(1),
      })

      const result = Schema.safeParse({ search: 'test', page: '2' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual({ search: 'test', page: 2 })
      }
    })

    it('should use default values for missing fields', () => {
      const Schema = z.object({
        search: z.string().default(''),
        page: z.coerce.number().default(1),
      })

      const result = Schema.safeParse({})

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual({ search: '', page: 1 })
      }
    })

    it('should coerce string numbers to numbers', () => {
      const Schema = z.object({
        page: z.coerce.number(),
        limit: z.coerce.number(),
      })

      const result = Schema.safeParse({ page: '5', limit: '10' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual({ page: 5, limit: 10 })
      }
    })

    it('should validate enums', () => {
      const Schema = z.object({
        status: z.enum(['active', 'inactive']).default('active'),
      })

      const result1 = Schema.safeParse({ status: 'active' })
      expect(result1.success).toBe(true)

      const result2 = Schema.safeParse({ status: 'invalid' })
      expect(result2.success).toBe(false)
    })
  })

  describe('nested object schemas', () => {
    it('should validate nested objects with defaults', () => {
      const Schema = z.object({
        user: z
          .object({
            name: z.string().default(''),
            age: z.coerce.number().default(0),
          })
          .default({ name: '', age: 0 }),
      })

      const result = Schema.safeParse({})

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual({
          user: { name: '', age: 0 },
        })
      }
    })

    it('should validate deeply nested objects', () => {
      const Schema = z.object({
        filters: z
          .object({
            date: z
              .object({
                from: z.string().default(''),
                to: z.string().default(''),
              })
              .default({ from: '', to: '' }),
          })
          .default({ date: { from: '', to: '' } }),
      })

      const result = Schema.safeParse({})

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.filters.date).toEqual({ from: '', to: '' })
      }
    })

    it('should fail without object-level defaults', () => {
      const Schema = z.object({
        user: z.object({
          name: z.string().default(''),
          age: z.coerce.number().default(0),
        }),
        // Missing .default() at object level
      })

      const result = Schema.safeParse({})

      expect(result.success).toBe(false)
    })

    it('should validate partial nested objects', () => {
      const Schema = z.object({
        user: z
          .object({
            name: z.string().default('John'),
            age: z.coerce.number().default(30),
          })
          .default({ name: 'John', age: 30 }),
      })

      const result = Schema.safeParse({ user: { name: 'Jane' } })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.user).toEqual({ name: 'Jane', age: 30 })
      }
    })
  })

  describe('array schemas', () => {
    it('should validate string arrays', () => {
      const Schema = z.object({
        tags: z.array(z.string()).default([]),
      })

      const result = Schema.safeParse({ tags: ['a', 'b', 'c'] })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.tags).toEqual(['a', 'b', 'c'])
      }
    })

    it('should validate number arrays with coercion', () => {
      const Schema = z.object({
        ids: z.array(z.coerce.number()).default([]),
      })

      const result = Schema.safeParse({ ids: ['1', '2', '3'] })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.ids).toEqual([1, 2, 3])
      }
    })

    it('should use default empty array', () => {
      const Schema = z.object({
        tags: z.array(z.string()).default([]),
      })

      const result = Schema.safeParse({})

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.tags).toEqual([])
      }
    })
  })

  describe('boolean schemas', () => {
    it('should coerce string booleans', () => {
      const Schema = z.object({
        active: z.coerce.boolean(),
      })

      const result1 = Schema.safeParse({ active: true })
      const result2 = Schema.safeParse({ active: false })

      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)

      if (result1.success) expect(result1.data.active).toBe(true)
      if (result2.success) expect(result2.data.active).toBe(false)
    })

    it('should handle boolean defaults', () => {
      const Schema = z.object({
        active: z.coerce.boolean().default(false),
      })

      const result = Schema.safeParse({})

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.active).toBe(false)
      }
    })
  })

  describe('validation and constraints', () => {
    it('should validate min/max for numbers', () => {
      const Schema = z.object({
        page: z.coerce.number().int().positive().min(1).max(100).default(1),
      })

      const result1 = Schema.safeParse({ page: '50' })
      const result2 = Schema.safeParse({ page: '0' })
      const result3 = Schema.safeParse({ page: '101' })

      expect(result1.success).toBe(true)
      expect(result2.success).toBe(false)
      expect(result3.success).toBe(false)
    })

    it('should validate string patterns', () => {
      const Schema = z.object({
        email: z.string().email().default(''),
      })

      const result1 = Schema.safeParse({ email: 'test@example.com' })
      const result2 = Schema.safeParse({ email: 'invalid' })

      expect(result1.success).toBe(true)
      expect(result2.success).toBe(false)
    })

    it('should validate string length', () => {
      const Schema = z.object({
        name: z.string().min(3).max(10).default(''),
      })

      const result1 = Schema.safeParse({ name: 'John' })
      const result2 = Schema.safeParse({ name: 'Jo' })
      const result3 = Schema.safeParse({ name: 'VeryLongName' })

      expect(result1.success).toBe(true)
      expect(result2.success).toBe(false)
      expect(result3.success).toBe(false)
    })
  })

  describe('optional and nullable', () => {
    it('should handle optional fields', () => {
      const Schema = z.object({
        search: z.string().optional(),
        page: z.coerce.number().default(1),
      })

      const result = Schema.safeParse({ page: '2' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual({ page: 2 })
      }
    })

    it('should handle nullable fields', () => {
      const Schema = z.object({
        search: z.string().nullable().default(null),
      })

      const result1 = Schema.safeParse({ search: null })
      const result2 = Schema.safeParse({})

      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)

      if (result1.success) expect(result1.data.search).toBe(null)
      if (result2.success) expect(result2.data.search).toBe(null)
    })
  })

  describe('complex real-world schemas', () => {
    it('should validate complex filter schema', () => {
      const FiltersSchema = z.object({
        search: z.string().default(''),
        page: z.coerce.number().int().positive().default(1),
        perPage: z.coerce.number().int().positive().default(25),
        status: z.enum(['active', 'inactive', 'pending']).default('active'),
        tags: z.array(z.string()).default([]),
        dateRange: z
          .object({
            from: z.string().default(''),
            to: z.string().default(''),
          })
          .default({ from: '', to: '' }),
      })

      const result = FiltersSchema.safeParse({
        search: 'test',
        page: '2',
        status: 'inactive',
        tags: ['vue', 'typescript'],
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual({
          search: 'test',
          page: 2,
          perPage: 25,
          status: 'inactive',
          tags: ['vue', 'typescript'],
          dateRange: { from: '', to: '' },
        })
      }
    })

    it('should validate table state schema', () => {
      const TableStateSchema = z.object({
        page: z.coerce.number().int().positive().default(1),
        sort: z
          .object({
            by: z.string().default('id'),
            order: z.enum(['asc', 'desc']).default('asc'),
          })
          .default({ by: 'id', order: 'asc' }),
        filters: z
          .object({
            search: z.string().default(''),
            active: z.coerce.boolean().default(true),
          })
          .default({ search: '', active: true }),
      })

      const result = TableStateSchema.safeParse({
        page: '3',
        sort: { by: 'name', order: 'desc' },
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual({
          page: 3,
          sort: { by: 'name', order: 'desc' },
          filters: { search: '', active: true },
        })
      }
    })
  })

  describe('error handling', () => {
    it('should provide detailed error information', () => {
      const Schema = z.object({
        page: z.coerce.number().int().positive(),
      })

      const result = Schema.safeParse({ page: '-5' })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeDefined()
        expect(result.error.issues).toBeDefined()
        expect(result.error.issues.length).toBeGreaterThan(0)
      }
    })

    it('should handle multiple validation errors', () => {
      const Schema = z.object({
        email: z.string().email(),
        age: z.coerce.number().int().positive().min(18),
      })

      const result = Schema.safeParse({ email: 'invalid', age: '10' })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThanOrEqual(1)
      }
    })
  })
})

describe('createEmptyObject', () => {
  describe('basic types', () => {
    it('should create empty string for z.string()', () => {
      const Schema = z.object({ name: z.string() })
      expect(createEmptyObject(Schema)).toEqual({ name: '' })
    })

    it('should create 0 for z.number()', () => {
      const Schema = z.object({ count: z.number() })
      expect(createEmptyObject(Schema)).toEqual({ count: 0 })
    })

    it('should create 0 for z.coerce.number()', () => {
      const Schema = z.object({ page: z.coerce.number() })
      expect(createEmptyObject(Schema)).toEqual({ page: 0 })
    })

    it('should create false for z.boolean()', () => {
      const Schema = z.object({ active: z.boolean() })
      expect(createEmptyObject(Schema)).toEqual({ active: false })
    })

    it('should create empty array for z.array()', () => {
      const Schema = z.object({ tags: z.array(z.string()) })
      expect(createEmptyObject(Schema)).toEqual({ tags: [] })
    })

    it('should create null for z.date()', () => {
      const Schema = z.object({ createdAt: z.date() })
      expect(createEmptyObject(Schema)).toEqual({ createdAt: null })
    })
  })

  describe('with explicit defaults (useDefaults: true)', () => {
    it('should use default value from z.string().default()', () => {
      const Schema = z.object({ name: z.string().default('hello') })
      expect(createEmptyObject(Schema)).toEqual({ name: 'hello' })
    })

    it('should use default value from z.number().default()', () => {
      const Schema = z.object({ page: z.coerce.number().default(1) })
      expect(createEmptyObject(Schema)).toEqual({ page: 1 })
    })

    it('should use default value from z.boolean().default()', () => {
      const Schema = z.object({ active: z.boolean().default(true) })
      expect(createEmptyObject(Schema)).toEqual({ active: true })
    })

    it('should use default value from z.array().default()', () => {
      const Schema = z.object({ tags: z.array(z.string()).default(['a', 'b']) })
      expect(createEmptyObject(Schema)).toEqual({ tags: ['a', 'b'] })
    })

    it('should use default null from z.number().nullable().default(null)', () => {
      const Schema = z.object({ value: z.coerce.number().nullable().default(null) })
      expect(createEmptyObject(Schema)).toEqual({ value: null })
    })

    it('should use undefined for a plain field whose base type is not specially handled', () => {
      const Schema = z.object({ status: z.enum(['a', 'b']) })
      expect(createEmptyObject(Schema)).toEqual({ status: undefined })
    })

    it('should use default from nested z.object().default()', () => {
      const Schema = z.object({
        filters: z
          .object({
            search: z.string().default(''),
            page: z.coerce.number().default(1),
          })
          .default({ search: '', page: 1 }),
      })
      expect(createEmptyObject(Schema)).toEqual({
        filters: { search: '', page: 1 },
      })
    })
  })

  describe('with useDefaults: false', () => {
    it('should ignore defaults and use type-based values for string', () => {
      const Schema = z.object({ name: z.string().default('hello') })
      expect(createEmptyObject(Schema, { useDefaults: false })).toEqual({ name: '' })
    })

    it('should ignore defaults and use type-based values for number', () => {
      const Schema = z.object({ page: z.coerce.number().default(5) })
      expect(createEmptyObject(Schema, { useDefaults: false })).toEqual({ page: 0 })
    })

    it('should ignore defaults and use type-based values for boolean', () => {
      const Schema = z.object({ active: z.boolean().default(true) })
      expect(createEmptyObject(Schema, { useDefaults: false })).toEqual({ active: false })
    })

    it('should ignore defaults and use empty array for array', () => {
      const Schema = z.object({ tags: z.array(z.string()).default(['a']) })
      expect(createEmptyObject(Schema, { useDefaults: false })).toEqual({ tags: [] })
    })

    it('should still use null for nullable fields', () => {
      const Schema = z.object({ value: z.number().nullable().default(null) })
      expect(createEmptyObject(Schema, { useDefaults: false })).toEqual({ value: null })
    })

    it('should still use undefined for optional fields', () => {
      const Schema = z.object({ search: z.string().optional() })
      expect(createEmptyObject(Schema, { useDefaults: false })).toEqual({ search: undefined })
    })
  })

  describe('nullable fields', () => {
    it('should create null for z.string().nullable()', () => {
      const Schema = z.object({ name: z.string().nullable() })
      expect(createEmptyObject(Schema)).toEqual({ name: null })
    })

    it('should create null for z.number().nullable()', () => {
      const Schema = z.object({ count: z.number().nullable() })
      expect(createEmptyObject(Schema)).toEqual({ count: null })
    })

    it('should create null for z.boolean().nullable()', () => {
      const Schema = z.object({ active: z.boolean().nullable() })
      expect(createEmptyObject(Schema)).toEqual({ active: null })
    })
  })

  describe('optional fields', () => {
    it('should create undefined for z.string().optional()', () => {
      const Schema = z.object({ name: z.string().optional() })
      expect(createEmptyObject(Schema)).toEqual({ name: undefined })
    })

    it('should create undefined for z.number().optional()', () => {
      const Schema = z.object({ count: z.number().optional() })
      expect(createEmptyObject(Schema)).toEqual({ count: undefined })
    })
  })

  describe('number constraints', () => {
    it('should use minValue for z.number().min()', () => {
      const Schema = z.object({ page: z.number().min(5) })
      expect(createEmptyObject(Schema)).toEqual({ page: 5 })
    })

    it('should use minValue + 1 for z.number().positive() (exclusive)', () => {
      const Schema = z.object({ count: z.number().positive() })
      // positive() sets minValue=0 but 0 is exclusive, so result is 1
      expect(createEmptyObject(Schema)).toEqual({ count: 1 })
    })

    it('should use 0 for z.number() without constraints', () => {
      const Schema = z.object({ value: z.number() })
      expect(createEmptyObject(Schema)).toEqual({ value: 0 })
    })

    it('should prefer default over minValue when useDefaults is true', () => {
      const Schema = z.object({ page: z.number().min(1).default(10) })
      expect(createEmptyObject(Schema)).toEqual({ page: 10 })
    })

    it('should use minValue when useDefaults is false even if default exists', () => {
      const Schema = z.object({ page: z.number().min(5).default(10) })
      expect(createEmptyObject(Schema, { useDefaults: false })).toEqual({ page: 5 })
    })
  })

  describe('nested objects', () => {
    it('should recursively create nested object', () => {
      const Schema = z.object({
        user: z.object({
          name: z.string(),
          age: z.number(),
        }),
      })
      expect(createEmptyObject(Schema)).toEqual({
        user: { name: '', age: 0 },
      })
    })

    it('should recursively create deeply nested objects', () => {
      const Schema = z.object({
        level1: z.object({
          level2: z.object({
            value: z.string(),
          }),
        }),
      })
      expect(createEmptyObject(Schema)).toEqual({
        level1: { level2: { value: '' } },
      })
    })

    it('should pass useDefaults option to nested objects', () => {
      const Schema = z.object({
        nested: z.object({
          name: z.string().default('inner'),
        }),
      })
      expect(createEmptyObject(Schema, { useDefaults: true })).toEqual({
        nested: { name: 'inner' },
      })
      expect(createEmptyObject(Schema, { useDefaults: false })).toEqual({
        nested: { name: '' },
      })
    })
  })

  describe('complex schemas', () => {
    it('should handle mixed field types', () => {
      const Schema = z.object({
        name: z.string().default(''),
        page: z.coerce.number().default(1),
        active: z.boolean().default(false),
        tags: z.array(z.string()).default([]),
        score: z.number().nullable(),
      })
      expect(createEmptyObject(Schema)).toEqual({
        name: '',
        page: 1,
        active: false,
        tags: [],
        score: null,
      })
    })

    it('should handle table filters schema', () => {
      const Schema = z.object({
        page: z.coerce.number().default(1),
        filters: z
          .object({
            title: z.string().default(''),
            created_at: z
              .object({
                from: z.coerce.number().nullable().default(null),
                to: z.coerce.number().nullable().default(null),
              })
              .default({ from: null, to: null }),
          })
          .default({ title: '', created_at: { from: null, to: null } }),
      })
      expect(createEmptyObject(Schema)).toEqual({
        page: 1,
        filters: {
          title: '',
          created_at: { from: null, to: null },
        },
      })
    })

    it('should handle schema without any defaults (useDefaults: false)', () => {
      const Schema = z.object({
        search: z.string().default('query'),
        page: z.coerce.number().default(5),
        active: z.boolean().default(true),
      })
      expect(createEmptyObject(Schema, { useDefaults: false })).toEqual({
        search: '',
        page: 0,
        active: false,
      })
    })
  })

  describe('edge cases', () => {
    it('should handle empty schema', () => {
      const Schema = z.object({})
      expect(createEmptyObject(Schema)).toEqual({})
    })

    it('should handle enum fields as undefined', () => {
      const Schema = z.object({
        status: z.enum(['active', 'inactive']),
      })
      expect(createEmptyObject(Schema)).toEqual({ status: undefined })
    })

    it('should handle enum with default', () => {
      const Schema = z.object({
        status: z.enum(['active', 'inactive']).default('active'),
      })
      expect(createEmptyObject(Schema)).toEqual({ status: 'active' })
    })

    it('should handle optional with default', () => {
      const Schema = z.object({
        name: z.string().optional().default('fallback'),
      })
      expect(createEmptyObject(Schema)).toEqual({ name: 'fallback' })
    })

    it('should handle nullable with default', () => {
      const Schema = z.object({
        name: z.string().nullable().default(null),
      })
      expect(createEmptyObject(Schema)).toEqual({ name: null })
    })

    it('should return result that passes schema validation', () => {
      const Schema = z.object({
        name: z.string().default(''),
        page: z.coerce.number().default(1),
        active: z.boolean().default(false),
        filters: z
          .object({
            search: z.string().default(''),
          })
          .default({ search: '' }),
      })
      const obj = createEmptyObject(Schema)
      const result = Schema.safeParse(obj)
      expect(result.success).toBe(true)
    })

    it('should return result with positive() that passes validation', () => {
      const Schema = z.object({
        count: z.number().positive(),
      })
      const obj = createEmptyObject(Schema)
      expect(obj.count).toBe(1)
      const result = Schema.safeParse(obj)
      expect(result.success).toBe(true)
    })
  })

  describe('withSchema option', () => {
    it('should not attach schema by default', () => {
      const Schema = z.object({ name: z.string().default('') })
      const obj = createEmptyObject(Schema)
      expect(SCHEMA_SYMBOL in obj).toBe(false)
    })

    it('should not attach schema when withSchema is false', () => {
      const Schema = z.object({ name: z.string().default('') })
      const obj = createEmptyObject(Schema, { withSchema: false })
      expect(SCHEMA_SYMBOL in obj).toBe(false)
    })

    it('should attach schema when withSchema is true', () => {
      const Schema = z.object({ name: z.string().default('') })
      const obj = createEmptyObject(Schema, { withSchema: true })
      expect(obj[SCHEMA_SYMBOL]).toBe(Schema)
    })

    it('should attach schema as markRaw (non-reactive)', () => {
      const Schema = z.object({ page: z.coerce.number().default(1) })
      const obj = createEmptyObject(Schema, { withSchema: true })
      // markRaw adds __v_skip flag
      expect((obj[SCHEMA_SYMBOL] as any).__v_skip).toBe(true)
    })

    it('should still produce correct values with withSchema', () => {
      const Schema = z.object({
        name: z.string().default('hello'),
        count: z.coerce.number().default(5),
      })
      const obj = createEmptyObject(Schema, { withSchema: true })
      expect(obj.name).toBe('hello')
      expect(obj.count).toBe(5)
      expect(obj[SCHEMA_SYMBOL]).toBe(Schema)
    })

    it('should work with withSchema and useDefaults together', () => {
      const Schema = z.object({
        name: z.string().default('hello'),
        count: z.number(),
      })
      const obj = createEmptyObject(Schema, { useDefaults: false, withSchema: true })
      expect(obj.name).toBe('')
      expect(obj.count).toBe(0)
      expect(obj[SCHEMA_SYMBOL]).toBe(Schema)
    })

    it('should attach schema to nested objects', () => {
      const NestedSchema = z.object({
        value: z.string(),
      })
      const Schema = z.object({
        nested: NestedSchema,
      })
      const obj = createEmptyObject(Schema, { withSchema: true })
      expect(obj[SCHEMA_SYMBOL]).toBe(Schema)
      expect(obj.nested[SCHEMA_SYMBOL as unknown as 'value']).toBe(NestedSchema)
    })

    it('should attach schema to deeply nested objects', () => {
      const Level2Schema = z.object({ val: z.string() })
      const Level1Schema = z.object({ level2: Level2Schema })
      const Schema = z.object({ level1: Level1Schema })
      const obj = createEmptyObject(Schema, { withSchema: true })
      expect(obj[SCHEMA_SYMBOL]).toBe(Schema)
      expect(obj.level1[SCHEMA_SYMBOL as unknown as 'level2']).toBe(Level1Schema)
      expect(obj.level1.level2[SCHEMA_SYMBOL as unknown as 'val']).toBe(Level2Schema)
    })

    it('should not attach schema to nested objects when withSchema is false', () => {
      const Schema = z.object({
        nested: z.object({
          value: z.string(),
        }),
      })
      const obj = createEmptyObject(Schema)
      expect(SCHEMA_SYMBOL in obj).toBe(false)
      expect(SCHEMA_SYMBOL in obj.nested).toBe(false)
    })

    it('should produce result that passes schema validation with withSchema', () => {
      const Schema = z.object({
        page: z.coerce.number().default(1),
        filters: z
          .object({
            search: z.string().default(''),
          })
          .default({ search: '' }),
      })
      const obj = createEmptyObject(Schema, { withSchema: true })
      const result = Schema.safeParse(obj)
      expect(result.success).toBe(true)
      expect(obj[SCHEMA_SYMBOL]).toBe(Schema)
    })
  })
})
