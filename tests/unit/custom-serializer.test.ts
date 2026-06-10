import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import type { QuerySerializer } from '../../src'
import { buildQuery } from '../../src/handlers/query/build-query'
import { computeSyncState } from '../../src/handlers/query/compute-sync-state'
import { applyTransform } from '../../src/handlers/helpers'

// A realistic custom serializer that JSON-encodes each registration's data under
// its `key` — a format the built-in serializer could never produce. It honours
// the QuerySerializer contract: `deserialize(serialize(data, { key }))` reproduces
// `{ [key]: data }`, which is what the handler relies on to extract each
// registration's subtree.
const jsonSerializer: QuerySerializer = {
  serialize: (data, options) => {
    const key = options?.key ?? '_'
    return { [key]: JSON.stringify(data) }
  },
  deserialize: (query) => {
    const out: Record<string, any> = {}
    for (const key of Object.keys(query)) {
      try {
        out[key] = JSON.parse(query[key] as string)
      } catch {
        out[key] = query[key]
      }
    }
    return out
  },
}

describe('custom serializer — WRITE path (buildQuery)', () => {
  const data = { ids: [1, 2, 3], q: 'x' }

  it('uses input.serialize to produce the query patch', () => {
    const result = buildQuery({
      items: [
        {
          data,
          initialQueryData: jsonSerializer.serialize(data, { key: 'f', arrayFormat: 'repeat', arraySeparator: ',' }),
          key: 'f',
          onlyChanges: false,
        },
      ],
      currentQuery: undefined,
      routeQuery: {},
      preserveUnusedKeys: true,
      preserveEmptyState: false,
      onlyChanges: false,
      emptyPlaceholder: '_',
      serialize: jsonSerializer.serialize,
    })

    expect(result.warnings).toEqual([])
    expect(result.newQuery).toEqual({ f: '{"ids":[1,2,3],"q":"x"}' })
  })

  it('still respects onlyChanges via the custom-serialized baseline', () => {
    // Current data equals the initial snapshot → its key is dropped from the URL.
    const result = buildQuery({
      items: [
        {
          data,
          initialQueryData: jsonSerializer.serialize(data, { key: 'f', arrayFormat: 'repeat', arraySeparator: ',' }),
          key: 'f',
          onlyChanges: true,
        },
      ],
      currentQuery: undefined,
      routeQuery: {},
      preserveUnusedKeys: true,
      preserveEmptyState: false,
      onlyChanges: true,
      emptyPlaceholder: '_',
      serialize: jsonSerializer.serialize,
    })

    expect(result.newQuery).toEqual({})
  })

  it('falls back to the built-in serializer when input.serialize is omitted', () => {
    const result = buildQuery({
      items: [{ data: { a: 1 }, initialQueryData: {}, key: undefined, onlyChanges: false }],
      currentQuery: undefined,
      routeQuery: {},
      preserveUnusedKeys: true,
      preserveEmptyState: false,
      onlyChanges: false,
      emptyPlaceholder: '_',
    })
    expect(result.newQuery).toEqual({ a: '1' })
  })
})

describe('custom serializer — READ path (deserialize → computeSyncState → coercion)', () => {
  const Schema = z.object({ ids: z.array(z.number()), q: z.string() })

  it('round-trips data through the custom serializer pair and the handler read flow', () => {
    const initialData = { ids: [] as number[], q: '' }
    const data = { ids: [1, 2, 3], q: 'hello' }

    // 1. serialize (data → URL query), exactly as register() builds it
    const query = jsonSerializer.serialize(data, { key: 'f', arrayFormat: 'repeat', arraySeparator: ',' })
    expect(query).toEqual({ f: '{"ids":[1,2,3],"q":"hello"}' })

    // 2. deserialize the whole route query (handler step)
    const deserialized = jsonSerializer.deserialize(query)
    expect(deserialized).toEqual({ f: { ids: [1, 2, 3], q: 'hello' } })

    // 3. extract this registration's subtree by key
    const sync = computeSyncState({
      deserializedState: deserialized,
      initialData,
      key: 'f',
      emptyPlaceholder: '_',
    })
    expect(sync.type).toBe('sync')

    // 4. validate/coerce via schema
    const transformed = applyTransform({
      state: (sync as { data: Record<string, unknown> }).data,
      initialData,
      schema: Schema,
      mergeOnlyExistingKeysWithoutTransform: true,
    })

    expect(transformed.warnings).toEqual([])
    expect(transformed.data).toEqual({ ids: [1, 2, 3], q: 'hello' })
  })

  it('the custom deserializer already returns typed values (no string coercion needed)', () => {
    const deserialized = jsonSerializer.deserialize({ f: '{"ids":[42],"q":"a"}' })
    // ids is a real number array straight out of JSON.parse — not URL strings
    expect(deserialized.f).toEqual({ ids: [42], q: 'a' })
  })
})

describe('custom serializer — receives the fully resolved options', () => {
  it('buildQuery forwards { key, arrayFormat, arraySeparator } to serialize', () => {
    const seen: unknown[] = []
    buildQuery({
      items: [
        {
          data: { ids: [1, 2] },
          initialQueryData: {},
          key: 'f',
          onlyChanges: false,
          arrayFormat: 'comma',
          arraySeparator: ';',
        },
      ],
      currentQuery: undefined,
      routeQuery: {},
      preserveUnusedKeys: true,
      preserveEmptyState: false,
      onlyChanges: false,
      emptyPlaceholder: '_',
      serialize: (_data, options) => {
        seen.push(options)
        return {}
      },
    })
    expect(seen).toEqual([{ key: 'f', arrayFormat: 'comma', arraySeparator: ';' }])
  })

  it('buildQuery fills in defaults when the item declares no array options', () => {
    const seen: unknown[] = []
    buildQuery({
      items: [{ data: { a: 1 }, initialQueryData: {}, key: undefined, onlyChanges: false }],
      currentQuery: undefined,
      routeQuery: {},
      preserveUnusedKeys: true,
      preserveEmptyState: false,
      onlyChanges: false,
      emptyPlaceholder: '_',
      serialize: (_data, options) => {
        seen.push(options)
        return {}
      },
    })
    expect(seen).toEqual([{ key: undefined, arrayFormat: 'repeat', arraySeparator: ',' }])
  })

  it('an options-aware custom serializer can honour arrayFormat / arraySeparator', () => {
    // A serializer that defers array encoding to the resolved options.
    const serialize: QuerySerializer['serialize'] = (data, options) => {
      const out: Record<string, string> = {}
      for (const [k, v] of Object.entries(data)) {
        const key = options.key ? `${options.key}[${k}]` : k
        out[key] =
          Array.isArray(v) && options.arrayFormat === 'comma'
            ? v.join(options.arraySeparator)
            : String(v)
      }
      return out
    }

    const result = buildQuery({
      items: [
        {
          data: { ids: [1, 2, 3] },
          initialQueryData: {},
          key: 'f',
          onlyChanges: false,
          arrayFormat: 'comma',
          arraySeparator: '|',
        },
      ],
      currentQuery: undefined,
      routeQuery: {},
      preserveUnusedKeys: true,
      preserveEmptyState: false,
      onlyChanges: false,
      emptyPlaceholder: '_',
      serialize,
    })

    expect(result.newQuery).toEqual({ 'f[ids]': '1|2|3' })
  })
})
