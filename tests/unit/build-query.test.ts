import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import {
  buildQuery,
  type BuildQueryInput,
  type BuildQueryItem,
} from '../../src/handlers/query/build-query'
import { serializeParams } from '../../src/handlers/query/helpers'
import {
  extractAdditionalDefaultDataFromSchema,
  extractDefaultsFromSchema,
} from '../../src/handlers/helpers'

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
  overrides: Partial<
    Omit<BuildQueryItem, 'data' | 'initialQueryData' | 'additionalDefaultQueryData'>
  > & {
    initialData?: Record<string, unknown>
    additionalDefaultData?: Record<string, unknown>
  } = {},
): BuildQueryItem {
  const { initialData, additionalDefaultData, ...rest } = overrides
  return {
    data,
    initialQueryData: serializeParams(initialData ?? data, { key: rest.key }),
    additionalDefaultQueryData: additionalDefaultData
      ? serializeParams(additionalDefaultData, { key: rest.key })
      : undefined,
    ...rest,
  }
}

describe('buildQuery', () => {
  describe('basic serialization', () => {
    it('should serialize single item without key', () => {
      const result = buildQuery(
        createInput({
          items: [createItem({ search: 'test', page: 1 })],
        }),
      )

      expect(result.newQuery).toEqual({ search: 'test', page: '1' })
      expect(result.newQueryRaw).toEqual({ search: 'test', page: '1' })
    })

    it('should serialize single item with key', () => {
      const result = buildQuery(
        createInput({
          items: [createItem({ search: 'test' }, { key: 'filters' })],
        }),
      )

      expect(result.newQuery).toEqual({ 'filters[search]': 'test' })
    })

    it('should combine multiple items', () => {
      const result = buildQuery(
        createInput({
          items: [
            createItem({ search: 'test' }, { key: 'f1' }),
            createItem({ page: 2 }, { key: 'f2' }),
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
            createItem({ search: 'test', page: 1 }, { initialData: { search: '', page: 1 } }),
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
            createItem({ search: 'test', page: 1 }, { initialData: { search: '', page: 1 } }),
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

    it('should work with key and onlyChanges', () => {
      const result = buildQuery(
        createInput({
          items: [
            createItem(
              { search: 'test', page: 1 },
              { key: 'f', initialData: { search: '', page: 1 } },
            ),
          ],
          onlyChanges: true,
        }),
      )

      expect(result.newQuery).toEqual({ 'f[search]': 'test' })
    })

    describe('additionalDefaultData', () => {
      it('should remove keys matching additionalDefaultData when onlyChanges is true', () => {
        // initial page is undefined (not serialized), but page=1 should also be treated as default
        const result = buildQuery(
          createInput({
            items: [
              createItem(
                { page: 1, search: 'test' },
                { initialData: {}, additionalDefaultData: { page: 1 } },
              ),
            ],
            onlyChanges: true,
          }),
        )

        expect(result.newQuery).toEqual({ search: 'test' })
      })

      it('should still remove keys matching initialData', () => {
        const result = buildQuery(
          createInput({
            items: [
              createItem(
                { page: 1, search: '' },
                { initialData: { search: '' }, additionalDefaultData: { page: 1 } },
              ),
            ],
            onlyChanges: true,
          }),
        )

        // page=1 matches additionalDefaultData, search='' matches initialData — both removed
        expect(result.newQuery).toEqual({})
      })

      it('should keep keys that differ from both initialData and additionalDefaultData', () => {
        const result = buildQuery(
          createInput({
            items: [
              createItem(
                { page: 2, search: 'hello' },
                { initialData: { search: '' }, additionalDefaultData: { page: 1 } },
              ),
            ],
            onlyChanges: true,
          }),
        )

        expect(result.newQuery).toEqual({ page: '2', search: 'hello' })
      })

      it('should have no effect when onlyChanges is false', () => {
        const result = buildQuery(
          createInput({
            items: [
              createItem(
                { page: 1, search: 'test' },
                { initialData: {}, additionalDefaultData: { page: 1 } },
              ),
            ],
            onlyChanges: false,
          }),
        )

        expect(result.newQuery).toEqual({ page: '1', search: 'test' })
      })

      it('should work with key', () => {
        const result = buildQuery(
          createInput({
            items: [
              createItem(
                { page: 1, search: 'test' },
                { key: 'f', initialData: {}, additionalDefaultData: { page: 1 } },
              ),
            ],
            onlyChanges: true,
          }),
        )

        expect(result.newQuery).toEqual({ 'f[search]': 'test' })
      })

      it('should not affect behavior when additionalDefaultData is undefined', () => {
        const result = buildQuery(
          createInput({
            items: [createItem({ page: 1, search: 'test' }, { initialData: { search: '' } })],
            onlyChanges: true,
          }),
        )

        // page=1 does not match initialData (no page key), so it stays
        expect(result.newQuery).toEqual({ page: '1', search: 'test' })
      })
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

    it('should use key as placeholder key when key exists', () => {
      const result = buildQuery(
        createInput({
          items: [
            createItem({ tags: undefined }, { key: 'filters', initialData: { tags: undefined } }),
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
            createItem({ search: 'a' }, { key: 'f1' }),
            createItem({ page: 1 }, { key: 'f2' }),
          ],
        }),
      )

      expect(result.warnings).toEqual([])
    })

    it('should warn on key collision even when the item has no causer', () => {
      const result = buildQuery(
        createInput({
          items: [createItem({ search: 'a' }), createItem({ search: 'b' })],
        }),
      )

      expect(result.warnings.length).toBe(1)
      expect(result.warnings[0]).toContain('Key search is already present')
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

    it('should not restore owned keys stripped by onlyChanges', () => {
      const result = buildQuery(
        createInput({
          items: [createItem({ name: 'John', search: '' })],
          routeQuery: { name: 'John' },
          preserveUnusedKeys: true,
          onlyChanges: true,
        }),
      )

      // name=John matches initial → stripped by onlyChanges
      // preserveUnusedKeys should NOT restore it because 'name' is an owned key
      expect(result.newQuery).toEqual({})
    })

    it('should preserve unowned keys while stripping owned defaults', () => {
      const result = buildQuery(
        createInput({
          items: [createItem({ name: 'John', search: '' })],
          routeQuery: { name: 'John', foo: 'bar' },
          preserveUnusedKeys: true,
          onlyChanges: true,
        }),
      )

      // name=John is owned and default → stripped, not restored
      // foo=bar is unowned → preserved
      expect(result.newQuery).toEqual({ foo: 'bar' })
    })

    it('should not restore owned keys with key prefix stripped by onlyChanges', () => {
      const result = buildQuery(
        createInput({
          items: [createItem({ search: 'test' }, { key: 'f' })],
          routeQuery: { 'f[search]': 'test', tab: 'main' },
          preserveUnusedKeys: true,
          onlyChanges: true,
        }),
      )

      // f[search]=test matches initial → stripped by onlyChanges
      // tab=main is unowned → preserved
      expect(result.newQuery).toEqual({ tab: 'main' })
    })

    it('should keep owned keys that differ from initial with preserveUnusedKeys', () => {
      const result = buildQuery(
        createInput({
          items: [createItem({ name: 'Jane' }, { initialData: { name: 'John' } })],
          routeQuery: { name: 'John', foo: 'bar' },
          preserveUnusedKeys: true,
          onlyChanges: true,
        }),
      )

      // name=Jane differs from initial John → kept in newQueryRaw
      // foo=bar is unowned → preserved
      expect(result.newQuery.name).toBe('Jane')
      expect(result.newQuery.foo).toBe('bar')
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
            createItem({ tags: undefined }, { key: 'f1', preserveEmptyState: true }),
            createItem({ page: 2 }, { key: 'f2' }),
          ],
        }),
      )

      // f1 is empty → placeholder 'f1' added, but f2 has real keys
      // The placeholder is key-based ('f1'), not '_', so cleanup doesn't apply
      expect(result.newQuery).toHaveProperty('f1')
      expect(result.newQuery).toHaveProperty('f2[page]')
    })

    it('should remove default placeholder when other keys exist', () => {
      const result = buildQuery(
        createInput({
          items: [
            createItem({ tags: undefined }, { preserveEmptyState: true }),
            createItem({ page: 2 }, { key: 'f2' }),
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

  describe('additionalDefaultData from schema meta', () => {
    /**
     * Helper that replicates the default-baseline logic from query handler's register():
     *   1. Option-level additionalDefaultData → additionalDefaultQueryData
     *   2. Schema-meta additionalDefaultData → schemaMetaDefaultQueryData (independent)
     *   3. Schema `.default()` values → schemaDefaultQueryData
     *
     * Each baseline is kept separate so that option and meta values for the same key
     * are both checked in buildQuery even when they differ.
     */
    function createItemWithSchemaMeta(
      data: Record<string, unknown>,
      overrides: {
        schema: unknown
        initialData?: Record<string, unknown>
        additionalDefaultData?: Record<string, unknown>
        key?: string
      },
    ): BuildQueryItem {
      const schemaAdditionalDefaults = extractAdditionalDefaultDataFromSchema(overrides.schema)
      const schemaDefaults = extractDefaultsFromSchema(overrides.schema)

      return {
        data,
        key: overrides.key,
        initialQueryData: serializeParams(overrides.initialData ?? data, {
          key: overrides.key,
        }),
        additionalDefaultQueryData: overrides.additionalDefaultData
          ? serializeParams(overrides.additionalDefaultData, { key: overrides.key })
          : undefined,
        schemaMetaDefaultQueryData: schemaAdditionalDefaults
          ? serializeParams(schemaAdditionalDefaults, { key: overrides.key })
          : undefined,
        schemaDefaultQueryData: schemaDefaults
          ? serializeParams(schemaDefaults, { key: overrides.key })
          : undefined,
      }
    }

    it('should omit key matching additionalDefaultData from schema meta', () => {
      const schema = z.object({
        page: z.coerce.number().default(1).meta({ additionalDefaultData: 3 }),
        search: z.string().default(''),
      })

      const result = buildQuery(
        createInput({
          items: [
            createItemWithSchemaMeta(
              { page: 3, search: 'test' },
              { schema, initialData: { page: undefined, search: '' } },
            ),
          ],
          onlyChanges: true,
        }),
      )

      // page=3 matches additionalDefaultData from meta → omitted
      expect(result.newQuery).toEqual({ search: 'test' })
    })

    it('should keep key that differs from both initial and schema meta additionalDefaultData', () => {
      const schema = z.object({
        page: z.coerce.number().default(1).meta({ additionalDefaultData: 3 }),
        search: z.string().default(''),
      })

      const result = buildQuery(
        createInput({
          items: [
            createItemWithSchemaMeta(
              { page: 5, search: 'test' },
              { schema, initialData: { page: undefined, search: '' } },
            ),
          ],
          onlyChanges: true,
        }),
      )

      // page=5 differs from both initial (undefined) and meta (3) → stays
      expect(result.newQuery).toEqual({ page: '5', search: 'test' })
    })

    it('should merge schema meta with option-level additionalDefaultData', () => {
      const schema = z.object({
        page: z.coerce.number().default(1).meta({ additionalDefaultData: 3 }),
        search: z.string().default(''),
      })

      const result = buildQuery(
        createInput({
          items: [
            createItemWithSchemaMeta(
              { page: 3, search: 'hello' },
              {
                schema,
                initialData: { page: undefined, search: '' },
                additionalDefaultData: { search: 'hello' },
              },
            ),
          ],
          onlyChanges: true,
        }),
      )

      // page=3 matches schema meta → omitted
      // search='hello' matches option-level additionalDefaultData → omitted
      expect(result.newQuery).toEqual({})
    })

    it('should let option-level additionalDefaultData override schema meta for the same key', () => {
      const schema = z.object({
        page: z.coerce.number().default(1).meta({ additionalDefaultData: 3 }),
        search: z.string().default(''),
      })

      const result = buildQuery(
        createInput({
          items: [
            createItemWithSchemaMeta(
              { page: 5, search: 'test' },
              {
                schema,
                initialData: { page: undefined, search: '' },
                additionalDefaultData: { page: 5 },
              },
            ),
          ],
          onlyChanges: true,
        }),
      )

      // page=5 matches option-level override (not schema meta's 3) → omitted
      expect(result.newQuery).toEqual({ search: 'test' })
    })

    it('should work with nested object schema meta', () => {
      const schema = z.object({
        filters: z
          .object({
            page: z.coerce.number().default(1).meta({ additionalDefaultData: 3 }),
            search: z.string().default(''),
          })
          .default({ page: 1, search: '' }),
      })

      const result = buildQuery(
        createInput({
          items: [
            createItemWithSchemaMeta(
              { filters: { page: 3, search: 'test' } },
              {
                schema,
                key: 'f',
                initialData: { filters: { page: undefined, search: '' } },
              },
            ),
          ],
          onlyChanges: true,
        }),
      )

      // filters.page=3 matches schema meta → omitted
      expect(result.newQuery).toEqual({ 'f[filters][search]': 'test' })
    })

    it('should work with multiple fields having schema meta', () => {
      const schema = z.object({
        page: z.coerce.number().default(1).meta({ additionalDefaultData: 3 }),
        perPage: z.coerce.number().default(10).meta({ additionalDefaultData: 25 }),
        search: z.string().default(''),
      })

      const result = buildQuery(
        createInput({
          items: [
            createItemWithSchemaMeta(
              { page: 3, perPage: 25, search: 'test' },
              { schema, initialData: { page: undefined, perPage: undefined, search: '' } },
            ),
          ],
          onlyChanges: true,
        }),
      )

      // Both page=3 and perPage=25 match their schema meta → omitted
      expect(result.newQuery).toEqual({ search: 'test' })
    })

    it('should have no effect when schema has no meta additionalDefaultData', () => {
      const schema = z.object({
        page: z.coerce.number().default(1),
        search: z.string().default(''),
      })

      const result = buildQuery(
        createInput({
          items: [
            createItemWithSchemaMeta(
              { page: 3, search: 'test' },
              { schema, initialData: { page: undefined, search: '' } },
            ),
          ],
          onlyChanges: true,
        }),
      )

      // No meta → page=3 stays (doesn't match initial)
      expect(result.newQuery).toEqual({ page: '3', search: 'test' })
    })

    it('should suppress both option-level and schema-meta values when they target the same key', () => {
      // This is the regression case: previously a shallow merge dropped the meta value
      // when option also declared the same key, so page=5 would appear in the URL.
      const schema = z.object({
        page: z.coerce.number().default(1).meta({ additionalDefaultData: 5 }),
        search: z.string().default(''),
      })

      // page=3 from option → omitted
      expect(
        buildQuery(
          createInput({
            items: [
              createItemWithSchemaMeta(
                { page: 3, search: 'test' },
                {
                  schema,
                  additionalDefaultData: { page: 3 },
                  initialData: { page: undefined, search: '' },
                },
              ),
            ],
            onlyChanges: true,
          }),
        ).newQuery,
      ).toEqual({ search: 'test' })

      // page=5 from schema meta → omitted even though option overrides meta for same key
      expect(
        buildQuery(
          createInput({
            items: [
              createItemWithSchemaMeta(
                { page: 5, search: 'test' },
                {
                  schema,
                  additionalDefaultData: { page: 3 },
                  initialData: { page: undefined, search: '' },
                },
              ),
            ],
            onlyChanges: true,
          }),
        ).newQuery,
      ).toEqual({ search: 'test' })

      // page=1 from schema .default() → omitted
      expect(
        buildQuery(
          createInput({
            items: [
              createItemWithSchemaMeta(
                { page: 1, search: 'test' },
                {
                  schema,
                  additionalDefaultData: { page: 3 },
                  initialData: { page: undefined, search: '' },
                },
              ),
            ],
            onlyChanges: true,
          }),
        ).newQuery,
      ).toEqual({ search: 'test' })

      // page=2 matches none of the baselines → stays
      expect(
        buildQuery(
          createInput({
            items: [
              createItemWithSchemaMeta(
                { page: 2, search: 'test' },
                {
                  schema,
                  additionalDefaultData: { page: 3 },
                  initialData: { page: undefined, search: '' },
                },
              ),
            ],
            onlyChanges: true,
          }),
        ).newQuery,
      ).toEqual({ page: '2', search: 'test' })
    })
  })

  describe('default baseline from schema .default()', () => {
    function createItemWithSchema(
      data: Record<string, unknown>,
      overrides: {
        schema: unknown
        initialData?: Record<string, unknown>
        additionalDefaultData?: Record<string, unknown>
        key?: string
      },
    ): BuildQueryItem {
      const schemaAdditionalDefaults = extractAdditionalDefaultDataFromSchema(overrides.schema)
      const schemaDefaults = extractDefaultsFromSchema(overrides.schema)

      return {
        data,
        key: overrides.key,
        initialQueryData: serializeParams(overrides.initialData ?? data, { key: overrides.key }),
        additionalDefaultQueryData: overrides.additionalDefaultData
          ? serializeParams(overrides.additionalDefaultData, { key: overrides.key })
          : undefined,
        schemaMetaDefaultQueryData: schemaAdditionalDefaults
          ? serializeParams(schemaAdditionalDefaults, { key: overrides.key })
          : undefined,
        schemaDefaultQueryData: schemaDefaults
          ? serializeParams(schemaDefaults, { key: overrides.key })
          : undefined,
      }
    }

    it('should omit a value matching the schema .default() (initial starts undefined)', () => {
      const schema = z.object({
        page: z.coerce.number().default(1),
        search: z.string().default(''),
      })

      const result = buildQuery(
        createInput({
          items: [
            createItemWithSchema(
              { page: 1, search: 'test' },
              { schema, initialData: { page: undefined, search: '' } },
            ),
          ],
          onlyChanges: true,
        }),
      )

      // page=1 matches schema .default(1) → omitted, even though initial was undefined
      expect(result.newQuery).toEqual({ search: 'test' })
    })

    it('should omit both the schema default and the meta additionalDefaultData value', () => {
      const schema = z.object({
        page: z.coerce.number().default(1).meta({ additionalDefaultData: 3 }),
        search: z.string().default(''),
      })

      // page=1 (schema default) → omitted
      expect(
        buildQuery(
          createInput({
            items: [
              createItemWithSchema(
                { page: 1, search: 'test' },
                { schema, initialData: { page: undefined, search: '' } },
              ),
            ],
            onlyChanges: true,
          }),
        ).newQuery,
      ).toEqual({ search: 'test' })

      // page=3 (meta additionalDefaultData) → omitted
      expect(
        buildQuery(
          createInput({
            items: [
              createItemWithSchema(
                { page: 3, search: 'test' },
                { schema, initialData: { page: undefined, search: '' } },
              ),
            ],
            onlyChanges: true,
          }),
        ).newQuery,
      ).toEqual({ search: 'test' })

      // page=2 (neither) → stays
      expect(
        buildQuery(
          createInput({
            items: [
              createItemWithSchema(
                { page: 2, search: 'test' },
                { schema, initialData: { page: undefined, search: '' } },
              ),
            ],
            onlyChanges: true,
          }),
        ).newQuery,
      ).toEqual({ page: '2', search: 'test' })
    })

    it('should omit nested object values matching their schema defaults', () => {
      const schema = z.object({
        filters: z
          .object({
            page: z.coerce.number().default(1),
            search: z.string().default(''),
          })
          .default({ page: 1, search: '' }),
      })

      const result = buildQuery(
        createInput({
          items: [
            createItemWithSchema(
              { filters: { page: 1, search: 'hello' } },
              { schema, key: 'f', initialData: { filters: { page: undefined, search: '' } } },
            ),
          ],
          onlyChanges: true,
        }),
      )

      // filters.page=1 matches nested schema default → omitted
      expect(result.newQuery).toEqual({ 'f[filters][search]': 'hello' })
    })

    it('should keep a value that differs from the schema default', () => {
      const schema = z.object({
        page: z.coerce.number().default(1),
      })

      const result = buildQuery(
        createInput({
          items: [createItemWithSchema({ page: 5 }, { schema, initialData: { page: undefined } })],
          onlyChanges: true,
        }),
      )

      expect(result.newQuery).toEqual({ page: '5' })
    })
  })
})
