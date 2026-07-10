import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import {
  serializeParams,
  deserializeParams,
  joinArrayValues,
  splitArrayValue,
} from '../../src/handlers/query/helpers'
import { applyTransform } from '../../src/handlers/helpers'
import { buildQuery } from '../../src/handlers/query/build-query'
import { asArray, asNumberArray } from '../../src/handlers/query/transform-helpers'

describe("serializeParams arrayFormat: 'comma'", () => {
  it('joins flat string arrays with a comma', () => {
    const result = serializeParams({ tags: ['a', 'b', 'c'] }, { arrayFormat: 'comma' })
    expect(result).toEqual({ tags: 'a,b,c' })
  })

  it('joins flat number arrays with a comma (as strings)', () => {
    const result = serializeParams({ ids: [1, 2, 3] }, { arrayFormat: 'comma' })
    expect(result).toEqual({ ids: '1,2,3' })
  })

  it('serializes a single-element array as a separator-less string', () => {
    const result = serializeParams({ ids: [1] }, { arrayFormat: 'comma' })
    expect(result).toEqual({ ids: '1' })
  })

  it('skips empty arrays', () => {
    const result = serializeParams({ ids: [], name: 'x' }, { arrayFormat: 'comma' })
    expect(result).toEqual({ name: 'x' })
  })

  it('supports a custom separator', () => {
    const result = serializeParams({ ids: [1, 2, 3] }, { arrayFormat: 'comma', arraySeparator: '|' })
    expect(result).toEqual({ ids: '1|2|3' })
  })

  it('applies the comma format to arrays nested inside objects', () => {
    const result = serializeParams({ filters: { ids: [1, 2] } }, { arrayFormat: 'comma' })
    expect(result).toEqual({ 'filters[ids]': '1,2' })
  })

  it('applies the comma format under a key prefix', () => {
    const result = serializeParams({ ids: [1, 2] }, { key: 'filters', arrayFormat: 'comma' })
    expect(result).toEqual({ 'filters[ids]': '1,2' })
  })

  it('still serializes arrays of objects as indexed keys (comma only affects scalar arrays)', () => {
    const result = serializeParams(
      { items: [{ id: 1 }, { id: 2 }] },
      { arrayFormat: 'comma', key: 'cart' },
    )
    expect(result).toEqual({
      'cart[items][0][id]': '1',
      'cart[items][1][id]': '2',
    })
  })

  it("defaults to 'repeat' when arrayFormat is omitted", () => {
    expect(serializeParams({ ids: [1, 2, 3] })).toEqual({ ids: ['1', '2', '3'] })
  })

  it('escapes a separator that appears inside a value', () => {
    const result = serializeParams(
      { items: ['Some value', 'with, comma', 'second value'] },
      { arrayFormat: 'comma' },
    )
    expect(result).toEqual({ items: 'Some value,with\\, comma,second value' })
  })

  it('escapes backslashes so they are not confused with escapes', () => {
    const result = serializeParams({ items: ['a\\b', 'c'] }, { arrayFormat: 'comma' })
    expect(result).toEqual({ items: 'a\\\\b,c' })
  })

  it('escapes a custom separator inside a value', () => {
    const result = serializeParams(
      { items: ['a|b', 'c'] },
      { arrayFormat: 'comma', arraySeparator: '|' },
    )
    expect(result).toEqual({ items: 'a\\|b|c' })
  })
})

describe('joinArrayValues / splitArrayValue (escape round-trip)', () => {
  const cases: { name: string; values: string[]; separator: string }[] = [
    { name: 'plain values', values: ['a', 'b', 'c'], separator: ',' },
    { name: 'value containing the separator', values: ['a,b', 'c'], separator: ',' },
    {
      name: 'multiple values each containing the separator',
      values: ['Some value', 'with, comma', 'second, value'],
      separator: ',',
    },
    { name: 'value that is only the separator', values: [',', 'x'], separator: ',' },
    { name: 'leading/trailing separators in value', values: [',a,', 'b'], separator: ',' },
    { name: 'value containing a backslash', values: ['a\\b', 'c'], separator: ',' },
    { name: 'value containing backslash + separator', values: ['a\\,b', 'c'], separator: ',' },
    { name: 'empty-string elements', values: ['', 'b', ''], separator: ',' },
    { name: 'custom separator inside value', values: ['a|b', 'c|d'], separator: '|' },
    { name: 'multi-char separator', values: ['a::b', 'c'], separator: '::' },
  ]

  for (const { name, values, separator } of cases) {
    it(`round-trips: ${name}`, () => {
      const joined = joinArrayValues(values, separator)
      expect(splitArrayValue(joined, separator)).toEqual(values)
    })
  }

  it('does not split on an escaped separator', () => {
    expect(splitArrayValue('a\\,b,c', ',')).toEqual(['a,b', 'c'])
  })

  it('splitArrayValue fast path (no backslash) matches native split', () => {
    expect(splitArrayValue('a,b,c', ',')).toEqual(['a', 'b', 'c'])
  })

  it('joinArrayValues fast path (nothing to escape) matches plain join', () => {
    expect(joinArrayValues(['a', 'b', 'c'], ',')).toEqual('a,b,c')
  })
})

describe('comma array round-trip via schema coercion', () => {
  const Schema = z.object({
    ids: z.array(z.number()),
    tags: z.array(z.string()),
  })

  function restore(data: Record<string, unknown>, initialData: { ids: number[]; tags: string[] }) {
    const serialized = serializeParams(data, { arrayFormat: 'comma' })
    const deserialized = deserializeParams(serialized)
    return applyTransform({
      state: deserialized,
      initialData,
      schema: Schema,
      mergeOnlyExistingKeysWithoutTransform: true,
      arraySeparator: ',',
    })
  }

  it('splits a comma-joined number array back into numbers', () => {
    const result = restore({ ids: [1, 2, 3], tags: ['x'] }, { ids: [], tags: [] })
    expect(result.warnings).toEqual([])
    expect(result.data).toEqual({ ids: [1, 2, 3], tags: ['x'] })
  })

  it('restores a single-element array (no separator present)', () => {
    const result = restore({ ids: [7], tags: ['a', 'b'] }, { ids: [], tags: [] })
    expect(result.data).toEqual({ ids: [7], tags: ['a', 'b'] })
  })

  it('restores string-array values that contain the separator (escaped round-trip)', () => {
    const result = restore(
      { ids: [1], tags: ['Some value', 'with, comma', 'second value'] },
      { ids: [], tags: [] },
    )
    expect(result.warnings).toEqual([])
    expect(result.data).toEqual({
      ids: [1],
      tags: ['Some value', 'with, comma', 'second value'],
    })
  })

  it('coerces array elements inside nested objects', () => {
    const NestedSchema = z.object({
      filters: z
        .object({ ids: z.array(z.number()) })
        .default({ ids: [] }),
    })
    const serialized = serializeParams({ filters: { ids: [4, 5] } }, { arrayFormat: 'comma' })
    const deserialized = deserializeParams(serialized)
    const result = applyTransform({
      state: deserialized,
      initialData: { filters: { ids: [] } },
      schema: NestedSchema,
      mergeOnlyExistingKeysWithoutTransform: true,
      arraySeparator: ',',
    })
    expect(result.data).toEqual({ filters: { ids: [4, 5] } })
  })

  it('without arraySeparator, falls back to single-element wrapping', () => {
    const serialized = serializeParams({ ids: [1, 2, 3], tags: [] }, { arrayFormat: 'comma' })
    const deserialized = deserializeParams(serialized)
    const result = applyTransform({
      state: deserialized,
      initialData: { ids: [], tags: [] },
      schema: Schema,
      mergeOnlyExistingKeysWithoutTransform: true,
      // no arraySeparator → "1,2,3" is treated as a single element and fails number coercion
    })
    // Falls back to initialData because [NaN-from-"1,2,3"] is rejected by z.number()
    expect(result.data).toEqual({ ids: [], tags: [] })
  })
})

describe('comma array round-trip via transform helpers', () => {
  it('asNumberArray splits a comma string when given a separator', () => {
    expect(asNumberArray('1,2,3', { separator: ',' })).toEqual([1, 2, 3])
  })

  it('asNumberArray without separator keeps the legacy single-element behavior', () => {
    expect(asNumberArray('1,2,3')).toEqual([0])
  })

  it('asNumberArray still handles native arrays', () => {
    expect(asNumberArray(['1', '2'], { separator: ',' })).toEqual([1, 2])
  })

  it('asArray splits a comma string when given a separator', () => {
    expect(asArray('a,b,c', { separator: ',' })).toEqual(['a', 'b', 'c'])
  })

  it('asArray maps split values through transform', () => {
    expect(asArray('1,2,3', { separator: ',', transform: (v) => Number(v) })).toEqual([1, 2, 3])
  })

  it('asArray without separator keeps the legacy single-element behavior', () => {
    expect(asArray('a,b,c')).toEqual(['a,b,c'])
  })

  it('asArray unescapes separators inside values (full serialize round-trip)', () => {
    const serialized = serializeParams(
      { items: ['Some value', 'with, comma', 'second value'] },
      { arrayFormat: 'comma' },
    )
    const deserialized = deserializeParams(serialized)
    expect(asArray(deserialized.items as string, { separator: ',' })).toEqual([
      'Some value',
      'with, comma',
      'second value',
    ])
  })
})

// Two query registrations with DIFFERENT array formats coexist without conflict,
// because each registration owns a disjoint set of query keys and its serialize
// config is applied only to its own keys — on write (its own patch) and on read
// (per-item coercion). Guards the per-register `serialize` override.
describe('mixed array formats across registrations (no conflict on disjoint keys)', () => {
  const comma = { ids: [1, 2, 3] } // key 'filters', comma
  const repeat = { cols: ['name', 'date'] } // key 'sort', repeat

  it('WRITE: each registration encodes its own keys in its own format', () => {
    const result = buildQuery({
      items: [
        {
          data: comma,
          initialQueryData: serializeParams(comma, { key: 'filters', arrayFormat: 'comma' }),
          key: 'filters',
          onlyChanges: false,
          arrayFormat: 'comma',
          arraySeparator: ',',
        },
        {
          data: repeat,
          initialQueryData: serializeParams(repeat, { key: 'sort', arrayFormat: 'repeat' }),
          key: 'sort',
          onlyChanges: false,
          arrayFormat: 'repeat',
        },
      ],
      currentQuery: undefined,
      routeQuery: {},
      preserveUnusedKeys: true,
      preserveEmptyState: false,
      onlyChanges: false,
      emptyPlaceholder: '_',
    })

    expect(result.warnings).toEqual([])
    expect(result.newQuery).toEqual({
      'filters[ids]': '1,2,3', // comma
      'sort[cols]': ['name', 'date'], // repeat
    })
  })

  it('READ: each registration splits only its own keys with its own separator', () => {
    const url = { 'filters[ids]': '1,2,3', 'sort[cols]': ['name', 'date'] }
    const deserialized = deserializeParams(url) as Record<string, any>

    const commaResult = applyTransform({
      state: deserialized.filters,
      initialData: { ids: [] as number[] },
      schema: z.object({ ids: z.array(z.number()) }),
      mergeOnlyExistingKeysWithoutTransform: true,
      arraySeparator: ',', // comma item
    })
    const repeatResult = applyTransform({
      state: deserialized.sort,
      initialData: { cols: [] as string[] },
      schema: z.object({ cols: z.array(z.string()) }),
      mergeOnlyExistingKeysWithoutTransform: true,
      arraySeparator: undefined, // repeat item — no splitting
    })

    expect(commaResult.data).toEqual({ ids: [1, 2, 3] })
    expect(repeatResult.data).toEqual({ cols: ['name', 'date'] })
  })
})
