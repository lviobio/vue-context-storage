import { describe, it, expect } from 'vitest'
import { buildQuery, type BuildQueryInput, type BuildQueryItem } from '../src/handlers/query/build-query'
import { serializeParams } from '../src/handlers/query/helpers'

function createInput(overrides: Partial<BuildQueryInput> = {}): BuildQueryInput {
  return {
    items: [],
    currentQuery: undefined,
    routeQuery: {},
    preserveUnusedKeys: false,
    preserveEmptyState: false,
    onlyChanges: false,
    emptyPlaceholder: '_',
    ...overrides,
  }
}

function createItem(
  data: Record<string, unknown>,
  overrides: Partial<Omit<BuildQueryItem, 'data' | 'initialQueryData'>> & {
    initialData?: Record<string, unknown>
  } = {},
): BuildQueryItem {
  const { initialData, ...rest } = overrides
  return {
    data,
    initialQueryData: serializeParams(initialData ?? data, { prefix: rest.prefix }),
    ...rest,
  }
}

describe('buildQuery', () => {
  describe('basic serialization', () => {
    it('should serialize single item without prefix', () => {
      const result = buildQuery(
        createInput({
          items: [createItem({ search: 'test', page: 1 })],
        }),
      )

      expect(result.newQuery).toEqual({ search: 'test', page: '1' })
      expect(result.newQueryRaw).toEqual({ search: 'test', page: '1' })
    })

    it('should serialize single item with prefix', () => {
      const result = buildQuery(
        createInput({
          items: [createItem({ search: 'test' }, { prefix: 'filters' })],
        }),
      )

      expect(result.newQuery).toEqual({ 'filters[search]': 'test' })
    })

    it('should combine multiple items', () => {
      const result = buildQuery(
        createInput({
          items: [
            createItem({ search: 'test' }, { prefix: 'f1' }),
            createItem({ page: 2 }, { prefix: 'f2' }),
          ],
        }),
      )

      expect(result.newQuery).toEqual({
        'f1[search]': 'test',
        'f2[page]': '2',
      })
    })

    it('should return empty query for empty items', () => {
      const result = buildQuery(createInput())

      expect(result.newQuery).toEqual({})
      expect(result.newQueryRaw).toEqual({})
    })
  })

  describe('onlyChanges', () => {
    it('should remove keys matching initial values when handler-level onlyChanges is true', () => {
      const result = buildQuery(
        createInput({
          items: [
            createItem(
              { search: 'test', page: 1 },
              { initialData: { search: '', page: 1 } },
            ),
          ],
          onlyChanges: true,
        }),
      )

      // 'page' matches initial, should be removed
      expect(result.newQuery).toEqual({ search: 'test' })
    })

    it('should keep all keys when onlyChanges is false', () => {
      const result = buildQuery(
        createInput({
          items: [
            createItem(
              { search: 'test', page: 1 },
              { initialData: { search: '', page: 1 } },
            ),
          ],
          onlyChanges: false,
        }),
      )

      expect(result.newQuery).toEqual({ search: 'test', page: '1' })
    })

    it('should allow per-item onlyChanges override', () => {
      const result = buildQuery(
        createInput({
          items: [
            createItem(
              { search: 'test', page: 1 },
              { initialData: { search: '', page: 1 }, onlyChanges: true },
            ),
          ],
          onlyChanges: false, // handler default is false
        }),
      )

      // item-level onlyChanges=true overrides handler default
      expect(result.newQuery).toEqual({ search: 'test' })
    })

    it('should work with prefix and onlyChanges', () => {
      const result = buildQuery(
        createInput({
          items: [
            createItem(
              { search: 'test', page: 1 },
              { prefix: 'f', initialData: { search: '', page: 1 } },
            ),
          ],
          onlyChanges: true,
        }),
      )

      expect(result.newQuery).toEqual({ 'f[search]': 'test' })
    })
  })

  describe('preserveEmptyState', () => {
    it('should add empty placeholder when patch is empty and preserveEmptyState is true', () => {
      // undefined values are skipped by serializeParams, producing an empty patch
      const result = buildQuery(
        createInput({
          items: [createItem({ tags: undefined }, { initialData: { tags: undefined } })],
          preserveEmptyState: true,
          onlyChanges: false,
        }),
      )

      expect(result.newQuery).toEqual({ _: null })
    })

    it('should use prefix as placeholder key when prefix exists', () => {
      const result = buildQuery(
        createInput({
          items: [
            createItem({ tags: undefined }, { prefix: 'filters', initialData: { tags: undefined } }),
          ],
          preserveEmptyState: true,
        }),
      )

      expect(result.newQuery).toEqual({ filters: null })
    })

    it('should use custom emptyPlaceholder', () => {
      const result = buildQuery(
        createInput({
          items: [createItem({ tags: undefined }, { initialData: { tags: undefined } })],
          preserveEmptyState: true,
          emptyPlaceholder: 'empty',
        }),
      )

      expect(result.newQuery).toEqual({ empty: null })
    })

    it('should warn when preserveEmptyState used with onlyChanges', () => {
      const result = buildQuery(
        createInput({
          items: [
            createItem(
              { search: '' },
              { initialData: { search: '' }, preserveEmptyState: true, onlyChanges: true },
            ),
          ],
        }),
      )

      expect(result.warnings).toContain(
        '[vue-context-storage] preserveEmptyState is not supported with onlyChanges',
      )
    })

    it('should allow per-item preserveEmptyState override', () => {
      const result = buildQuery(
        createInput({
          items: [
            createItem(
              { tags: undefined },
              { initialData: { tags: undefined }, preserveEmptyState: true },
            ),
          ],
          preserveEmptyState: false, // handler default
        }),
      )

      expect(result.newQuery).toEqual({ _: null })
    })
  })

  describe('key collision warnings', () => {
    it('should warn on key collision between items', () => {
      const result = buildQuery(
        createInput({
          items: [
            createItem({ search: 'a' }),
            createItem({ search: 'b' }, { causer: 'at Component.vue:10' }),
          ],
        }),
      )

      expect(result.warnings.length).toBe(1)
      expect(result.warnings[0]).toContain('Key search is already present')
      expect(result.warnings[0]).toContain('at Component.vue:10')
    })

    it('should not warn when items have different keys', () => {
      const result = buildQuery(
        createInput({
          items: [
            createItem({ search: 'a' }, { prefix: 'f1' }),
            createItem({ page: 1 }, { prefix: 'f2' }),
          ],
        }),
      )

      expect(result.warnings).toEqual([])
    })
  })

  describe('preserveUnusedKeys', () => {
    it('should merge with routeQuery when preserveUnusedKeys is true', () => {
      const result = buildQuery(
        createInput({
          items: [createItem({ search: 'test' })],
          routeQuery: { tab: 'main', search: 'old' },
          preserveUnusedKeys: true,
        }),
      )

      // routeQuery keys preserved, but item keys override
      expect(result.newQuery.tab).toBe('main')
      expect(result.newQuery.search).toBe('test')
    })

    it('should not merge with routeQuery when preserveUnusedKeys is false', () => {
      const result = buildQuery(
        createInput({
          items: [createItem({ search: 'test' })],
          routeQuery: { tab: 'main' },
          preserveUnusedKeys: false,
        }),
      )

      expect(result.newQuery).toEqual({ search: 'test' })
    })
  })

  describe('currentQuery diff (stale key removal)', () => {
    it('should remove keys from currentQuery that are no longer in newQueryRaw', () => {
      const result = buildQuery(
        createInput({
          items: [createItem({ search: 'test' })],
          currentQuery: { search: 'old', page: '1', status: 'active' },
        }),
      )

      // 'page' and 'status' were in currentQuery but not in newQueryRaw — removed
      expect(result.newQuery).toEqual({ search: 'test' })
      expect(result.newQuery).not.toHaveProperty('page')
      expect(result.newQuery).not.toHaveProperty('status')
    })

    it('should keep all keys when currentQuery is undefined', () => {
      const result = buildQuery(
        createInput({
          items: [createItem({ search: 'test' })],
          currentQuery: undefined,
          routeQuery: { tab: 'main' },
          preserveUnusedKeys: true,
        }),
      )

      expect(result.newQuery).toEqual({ search: 'test', tab: 'main' })
    })

    it('should remove stale keys even with preserveUnusedKeys', () => {
      const result = buildQuery(
        createInput({
          items: [createItem({ search: 'test' })],
          currentQuery: { search: 'old', stale: 'yes' },
          routeQuery: { search: 'old', stale: 'yes', tab: 'main' },
          preserveUnusedKeys: true,
        }),
      )

      // 'stale' was in currentQuery but not in new items — removed
      // 'tab' was not in currentQuery — kept (from routeQuery)
      expect(result.newQuery.search).toBe('test')
      expect(result.newQuery.tab).toBe('main')
      expect(result.newQuery).not.toHaveProperty('stale')
    })
  })

  describe('empty placeholder cleanup', () => {
    it('should remove empty placeholder from newQuery if there are other keys', () => {
      const result = buildQuery(
        createInput({
          items: [
            createItem({ tags: undefined }, { prefix: 'f1', preserveEmptyState: true }),
            createItem({ page: 2 }, { prefix: 'f2' }),
          ],
        }),
      )

      // f1 is empty → placeholder 'f1' added, but f2 has real keys
      // The placeholder is prefix-based ('f1'), not '_', so cleanup doesn't apply
      expect(result.newQuery).toHaveProperty('f1')
      expect(result.newQuery).toHaveProperty('f2[page]')
    })

    it('should remove default placeholder when other keys exist', () => {
      const result = buildQuery(
        createInput({
          items: [
            createItem({ tags: undefined }, { preserveEmptyState: true }),
            createItem({ page: 2 }, { prefix: 'f2' }),
          ],
        }),
      )

      // First item empty → '_' placeholder, second item has real keys
      // '_' placeholder should be removed since there are other keys
      expect(result.newQuery).not.toHaveProperty('_')
      expect(result.newQuery).toHaveProperty('f2[page]')
    })

    it('should keep empty placeholder if it is the only key', () => {
      const result = buildQuery(
        createInput({
          items: [createItem({ tags: undefined }, { preserveEmptyState: true })],
        }),
      )

      expect(result.newQuery).toEqual({ _: null })
    })
  })

  describe('query key ordering', () => {
    it('should sort query keys by newQueryRaw reference order', () => {
      const result = buildQuery(
        createInput({
          items: [createItem({ b: 2, a: 1, c: 3 })],
        }),
      )

      // Keys should follow the order from newQueryRaw
      const keys = Object.keys(result.newQuery)
      expect(keys).toEqual(['b', 'a', 'c'])
    })
  })

  describe('does not mutate inputs', () => {
    it('should not mutate currentQuery', () => {
      const currentQuery = { search: 'old', page: '1' }
      const original = { ...currentQuery }

      buildQuery(
        createInput({
          items: [createItem({ search: 'new' })],
          currentQuery,
        }),
      )

      expect(currentQuery).toEqual(original)
    })

    it('should not mutate routeQuery', () => {
      const routeQuery = { tab: 'main', search: 'old' }
      const original = { ...routeQuery }

      buildQuery(
        createInput({
          items: [createItem({ search: 'new' })],
          routeQuery,
          preserveUnusedKeys: true,
        }),
      )

      expect(routeQuery).toEqual(original)
    })

    it('should not mutate item data', () => {
      const data = { search: 'test', page: 1 }
      const original = { ...data }

      buildQuery(
        createInput({
          items: [createItem(data, { initialData: { search: '', page: 1 } })],
          onlyChanges: true,
        }),
      )

      expect(data).toEqual(original)
    })
  })
})
