import { describe, it, expect } from 'vitest'
import { z } from 'zod'

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
