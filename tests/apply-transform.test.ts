import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { applyTransform, syncReactive } from '../src/handlers/helpers'
import { computeSyncState } from '../src/handlers/query/compute-sync-state'
import { cloneDeep } from 'lodash'

describe('applyTransform', () => {
  describe('schema with partial state', () => {
    it('should succeed when nested object is missing from state but present in initialData', () => {
      const schema = z.object({
        page: z.coerce.number(),
        filters: z.object({
          title: z.string(),
        }),
      })

      const result = applyTransform({
        state: { page: '2' },
        initialData: { page: 1, filters: { title: '' } },
        schema,
        mergeOnlyExistingKeysWithoutTransform: false,
      })

      expect(result.warnings).toEqual([])
      expect(result.data).toEqual({ page: 2, filters: { title: '' } })
    })

    it('should succeed with deeply nested objects missing from state', () => {
      const schema = z.object({
        page: z.coerce.number(),
        filters: z.object({
          title: z.string(),
          created_at: z.object({
            from: z.coerce.number().nullable(),
            to: z.coerce.number().nullable(),
          }),
        }),
      })

      const result = applyTransform({
        state: { page: '3' },
        initialData: {
          page: 1,
          filters: { title: '', created_at: { from: null, to: null } },
        },
        schema,
        mergeOnlyExistingKeysWithoutTransform: false,
      })

      expect(result.warnings).toEqual([])
      expect(result.data).toEqual({
        page: 3,
        filters: { title: '', created_at: { from: null, to: null } },
      })
    })

    it('should use state values over initialData when both present', () => {
      const schema = z.object({
        page: z.coerce.number(),
        filters: z.object({
          title: z.string(),
        }),
      })

      const result = applyTransform({
        state: { page: '5', filters: { title: 'hello' } },
        initialData: { page: 1, filters: { title: '' } },
        schema,
        mergeOnlyExistingKeysWithoutTransform: false,
      })

      expect(result.warnings).toEqual([])
      expect(result.data).toEqual({ page: 5, filters: { title: 'hello' } })
    })

    it('should partially merge nested objects from state', () => {
      const schema = z.object({
        filters: z.object({
          title: z.string(),
          created_at: z.object({
            from: z.coerce.number().nullable(),
            to: z.coerce.number().nullable(),
          }),
        }),
      })

      const result = applyTransform({
        state: { filters: { title: 'Vue' } },
        initialData: {
          filters: { title: '', created_at: { from: null, to: null } },
        },
        schema,
        mergeOnlyExistingKeysWithoutTransform: false,
      })

      expect(result.warnings).toEqual([])
      expect(result.data).toEqual({
        filters: { title: 'Vue', created_at: { from: null, to: null } },
      })
    })

    it('should still work with schemas that have .default() on nested objects', () => {
      const schema = z.object({
        page: z.coerce.number().default(1),
        filters: z
          .object({
            title: z.string().default(''),
          })
          .default({ title: '' }),
      })

      const result = applyTransform({
        state: { page: '2' },
        initialData: { page: 1, filters: { title: '' } },
        schema,
        mergeOnlyExistingKeysWithoutTransform: false,
      })

      expect(result.warnings).toEqual([])
      expect(result.data).toEqual({ page: 2, filters: { title: '' } })
    })

    it('should fall back to initialData when schema fails even after merge', () => {
      const schema = z.object({
        page: z.coerce.number().int().positive(),
        status: z.enum(['active', 'inactive']),
      })

      const result = applyTransform({
        state: { page: 'not-a-number', status: 'invalid' },
        initialData: { page: 1, status: 'active' as const },
        schema,
        mergeOnlyExistingKeysWithoutTransform: false,
      })

      expect(result.warnings).toHaveLength(1)
      expect(result.warnings[0].message).toContain('schema parse failed')
      expect(result.data).toEqual({ page: 1, status: 'active' })
    })
  })

  describe('automatic array coercion for schema', () => {
    it('should coerce a single string to array when schema expects .array()', () => {
      const schema = z.object({
        tags: z.string().array().default([]),
      })

      const result = applyTransform({
        state: { tags: 'vue' },
        initialData: { tags: [] as string[] },
        schema,
        mergeOnlyExistingKeysWithoutTransform: false,
      })

      expect(result.warnings).toEqual([])
      expect(result.data).toEqual({ tags: ['vue'] })
    })

    it('should coerce a single string to number array when schema expects z.coerce.number().array()', () => {
      const schema = z.object({
        ids: z.coerce.number().array().default([]),
      })

      const result = applyTransform({
        state: { ids: '42' },
        initialData: { ids: [] as number[] },
        schema,
        mergeOnlyExistingKeysWithoutTransform: false,
      })

      expect(result.warnings).toEqual([])
      expect(result.data).toEqual({ ids: [42] })
    })

    it('should not touch values that are already arrays', () => {
      const schema = z.object({
        tags: z.string().array().default([]),
      })

      const result = applyTransform({
        state: { tags: ['a', 'b'] },
        initialData: { tags: [] as string[] },
        schema,
        mergeOnlyExistingKeysWithoutTransform: false,
      })

      expect(result.warnings).toEqual([])
      expect(result.data).toEqual({ tags: ['a', 'b'] })
    })

    it('should coerce arrays inside nested objects', () => {
      const schema = z.object({
        filters: z.object({
          statuses: z.enum(['active', 'inactive']).array().default([]),
        }),
      })

      const result = applyTransform({
        state: { filters: { statuses: 'active' } },
        initialData: { filters: { statuses: [] as string[] } },
        schema,
        mergeOnlyExistingKeysWithoutTransform: false,
      })

      expect(result.warnings).toEqual([])
      expect(result.data).toEqual({ filters: { statuses: ['active'] } })
    })

    it('should handle multiple array fields at once', () => {
      const schema = z.object({
        tags: z.string().array().default([]),
        ids: z.coerce.number().array().default([]),
        name: z.string().default(''),
      })

      const result = applyTransform({
        state: { tags: 'vue', ids: '1', name: 'test' },
        initialData: { tags: [] as string[], ids: [] as number[], name: '' },
        schema,
        mergeOnlyExistingKeysWithoutTransform: false,
      })

      expect(result.warnings).toEqual([])
      expect(result.data).toEqual({ tags: ['vue'], ids: [1], name: 'test' })
    })

    it('should not coerce null or undefined to array', () => {
      const schema = z.object({
        tags: z.string().array().nullable().default(null),
      })

      const result = applyTransform({
        state: {},
        initialData: { tags: null },
        schema,
        mergeOnlyExistingKeysWithoutTransform: false,
      })

      expect(result.warnings).toEqual([])
      expect(result.data).toEqual({ tags: null })
    })

    it('should coerce inside deeply nested objects', () => {
      const schema = z.object({
        level1: z.object({
          level2: z.object({
            items: z.coerce.number().array().default([]),
          }),
        }),
      })

      const result = applyTransform({
        state: { level1: { level2: { items: '5' } } },
        initialData: { level1: { level2: { items: [] as number[] } } },
        schema,
        mergeOnlyExistingKeysWithoutTransform: false,
      })

      expect(result.warnings).toEqual([])
      expect(result.data).toEqual({ level1: { level2: { items: [5] } } })
    })
  })

  describe('automatic boolean coercion for schema', () => {
    it('should coerce string "1" to true when schema expects z.boolean()', () => {
      const schema = z.object({
        active: z.boolean().default(false),
      })

      const result = applyTransform({
        state: { active: '1' },
        initialData: { active: false },
        schema,
        mergeOnlyExistingKeysWithoutTransform: false,
      })

      expect(result.warnings).toEqual([])
      expect(result.data).toEqual({ active: true })
    })

    it('should coerce string "0" to false when schema expects z.boolean()', () => {
      const schema = z.object({
        active: z.boolean().default(true),
      })

      const result = applyTransform({
        state: { active: '0' },
        initialData: { active: true },
        schema,
        mergeOnlyExistingKeysWithoutTransform: false,
      })

      expect(result.warnings).toEqual([])
      expect(result.data).toEqual({ active: false })
    })

    it('should not touch native booleans', () => {
      const schema = z.object({
        active: z.boolean().default(false),
      })

      const result = applyTransform({
        state: { active: true },
        initialData: { active: false },
        schema,
        mergeOnlyExistingKeysWithoutTransform: false,
      })

      expect(result.warnings).toEqual([])
      expect(result.data).toEqual({ active: true })
    })

    it('should coerce booleans inside nested objects', () => {
      const schema = z.object({
        settings: z.object({
          enabled: z.boolean().default(false),
          visible: z.boolean().default(true),
        }),
      })

      const result = applyTransform({
        state: { settings: { enabled: '1', visible: '0' } },
        initialData: { settings: { enabled: false, visible: true } },
        schema,
        mergeOnlyExistingKeysWithoutTransform: false,
      })

      expect(result.warnings).toEqual([])
      expect(result.data).toEqual({ settings: { enabled: true, visible: false } })
    })

    it('should handle boolean and array coercion together', () => {
      const schema = z.object({
        active: z.boolean().default(false),
        tags: z.string().array().default([]),
      })

      const result = applyTransform({
        state: { active: '1', tags: 'vue' },
        initialData: { active: false, tags: [] as string[] },
        schema,
        mergeOnlyExistingKeysWithoutTransform: false,
      })

      expect(result.warnings).toEqual([])
      expect(result.data).toEqual({ active: true, tags: ['vue'] })
    })
  })

  describe('schema takes priority over transform', () => {
    it('should warn when both schema and transform are provided', () => {
      const schema = z.object({ name: z.string().default('') })

      const result = applyTransform({
        state: { name: 'test' },
        initialData: { name: '' },
        schema,
        transform: (v) => ({ name: String(v.name) }),
        mergeOnlyExistingKeysWithoutTransform: false,
      })

      expect(result.warnings).toHaveLength(1)
      expect(result.warnings[0].message).toContain('transform is not supported with schema')
    })
  })

  describe('transform path (no schema)', () => {
    it('should apply transform function', () => {
      const result = applyTransform({
        state: { page: '2', name: 'test' },
        initialData: { page: 1, name: '' },
        transform: (v) => ({ page: Number(v.page), name: String(v.name) }),
        mergeOnlyExistingKeysWithoutTransform: false,
      })

      expect(result.warnings).toEqual([])
      expect(result.data).toEqual({ page: 2, name: 'test' })
    })
  })

  describe('default merge (no schema, no transform)', () => {
    it('should pick only existing keys when mergeOnlyExistingKeysWithoutTransform is true', () => {
      const result = applyTransform({
        state: { page: '2', unknown: 'value' },
        initialData: { page: 1 },
        mergeOnlyExistingKeysWithoutTransform: true,
      })

      expect(result.data).toEqual({ page: '2' })
    })

    it('should pass through all keys when mergeOnlyExistingKeysWithoutTransform is false', () => {
      const result = applyTransform({
        state: { page: '2', unknown: 'value' },
        initialData: { page: 1 },
        mergeOnlyExistingKeysWithoutTransform: false,
      })

      expect(result.data).toEqual({ page: '2', unknown: 'value' })
    })
  })
})

describe('syncReactive + initialData reference safety', () => {
  it('should not corrupt initialData when syncReactive uses cloneDeep', () => {
    const initialData = {
      page: 1,
      filters: {
        title: '',
        created_at: { from: null as number | null, to: null as number | null },
      },
    }

    // Simulate what the query handler does: itemState is a mutable object
    const itemState: Record<string, unknown> = cloneDeep(initialData)

    // 1. First reset: navigate to empty URL → computeSyncState returns reset with initialData
    const result1 = computeSyncState({
      deserializedState: {},
      initialData,
      emptyPlaceholder: '_',
    })
    expect(result1.type).toBe('reset')
    if (result1.type !== 'reset') return

    // Apply reset WITH cloneDeep (the fix)
    syncReactive(itemState, cloneDeep(result1.data))

    // 2. User mutates nested data
    ;(itemState.filters as any).title = 'hello'

    // 3. initialData must NOT be corrupted
    expect(initialData.filters.title).toBe('')
  })

  it('corrupts initialData when syncReactive is used WITHOUT cloneDeep (demonstrates the bug)', () => {
    const initialData = {
      page: 1,
      filters: { title: '' },
    }

    const itemState: Record<string, unknown> = cloneDeep(initialData)

    const result = computeSyncState({
      deserializedState: {},
      initialData,
      emptyPlaceholder: '_',
    })
    expect(result.type).toBe('reset')
    if (result.type !== 'reset') return

    // Without cloneDeep — shared reference
    syncReactive(itemState, result.data)

    // Now itemState.filters === initialData.filters (same object!)
    expect(itemState.filters).toBe(initialData.filters)

    // Mutating itemState also mutates initialData
    ;(itemState.filters as any).title = 'corrupted'
    expect(initialData.filters.title).toBe('corrupted')
  })

  it('second reset should restore original values after cloneDeep fix', () => {
    const initialData = {
      page: 1,
      filters: { title: '', score: null as number | null },
    }

    const itemState: Record<string, unknown> = cloneDeep(initialData)

    // First reset
    const result1 = computeSyncState({
      deserializedState: {},
      initialData,
      emptyPlaceholder: '_',
    })
    if (result1.type !== 'reset') return
    syncReactive(itemState, cloneDeep(result1.data))

    // User changes data
    ;(itemState.filters as any).title = 'changed'
    ;(itemState as any).page = 5

    // Second reset — should restore to original initialData
    const result2 = computeSyncState({
      deserializedState: {},
      initialData,
      emptyPlaceholder: '_',
    })
    if (result2.type !== 'reset') return
    syncReactive(itemState, cloneDeep(result2.data))

    expect(itemState).toEqual({ page: 1, filters: { title: '', score: null } })
    // initialData is still clean
    expect(initialData).toEqual({ page: 1, filters: { title: '', score: null } })
  })
})
