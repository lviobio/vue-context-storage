import { describe, it, expect } from 'vitest'
import {
  parsePrefixParts,
  getByPrefix,
  setByPrefix,
  resolvePrefixSegments,
  type ContextStoragePrefixSegment,
} from '../src/prefix'

describe('parsePrefixParts', () => {
  it('should return empty array for empty string', () => {
    expect(parsePrefixParts('')).toEqual([])
  })

  it('should return single part for simple string', () => {
    expect(parsePrefixParts('tables')).toEqual(['tables'])
  })

  it('should split bracket notation into parts', () => {
    expect(parsePrefixParts('tables[first]')).toEqual(['tables', 'first'])
  })

  it('should split deeply nested bracket notation', () => {
    expect(parsePrefixParts('a[b][c][d]')).toEqual(['a', 'b', 'c', 'd'])
  })
})

describe('getByPrefix', () => {
  it('should get top-level value', () => {
    expect(getByPrefix({ a: 1 }, 'a')).toBe(1)
  })

  it('should get nested value with bracket notation', () => {
    expect(getByPrefix({ a: { b: { x: 1 } } }, 'a[b]')).toEqual({ x: 1 })
  })

  it('should get deeply nested value', () => {
    expect(getByPrefix({ a: { b: { c: 42 } } }, 'a[b][c]')).toBe(42)
  })

  it('should return undefined for missing path', () => {
    expect(getByPrefix({ a: 1 }, 'b')).toBeUndefined()
  })

  it('should return undefined for missing nested path', () => {
    expect(getByPrefix({ a: { x: 1 } }, 'a[b]')).toBeUndefined()
  })

  it('should return undefined when traversing through non-object', () => {
    expect(getByPrefix({ a: 'string' }, 'a[b]')).toBeUndefined()
  })

  it('should return undefined when traversing through null', () => {
    expect(getByPrefix({ a: null }, 'a[b]')).toBeUndefined()
  })
})

describe('setByPrefix', () => {
  it('should set top-level value', () => {
    const obj: Record<string, unknown> = {}
    setByPrefix(obj, 'a', 1)
    expect(obj).toEqual({ a: 1 })
  })

  it('should set nested value with bracket notation', () => {
    const obj: Record<string, unknown> = {}
    setByPrefix(obj, 'a[b]', { x: 1 })
    expect(obj).toEqual({ a: { b: { x: 1 } } })
  })

  it('should set deeply nested value', () => {
    const obj: Record<string, unknown> = {}
    setByPrefix(obj, 'a[b][c]', 42)
    expect(obj).toEqual({ a: { b: { c: 42 } } })
  })

  it('should preserve existing siblings', () => {
    const obj: Record<string, unknown> = { a: { x: 1 } }
    setByPrefix(obj, 'a[y]', 2)
    expect(obj).toEqual({ a: { x: 1, y: 2 } })
  })

  it('should overwrite non-object intermediate values', () => {
    const obj: Record<string, unknown> = { a: 'string' }
    setByPrefix(obj, 'a[b]', 1)
    expect(obj).toEqual({ a: { b: 1 } })
  })
})

describe('resolvePrefixSegments', () => {
  describe('string segments (apply to all handlers)', () => {
    it('should return empty string for empty segments', () => {
      expect(resolvePrefixSegments([], 'query')).toBe('')
    })

    it('should return single segment as-is', () => {
      expect(resolvePrefixSegments(['tables'], 'query')).toBe('tables')
    })

    it('should concatenate multiple segments with bracket notation', () => {
      expect(resolvePrefixSegments(['tables', 'first'], 'query')).toBe('tables[first]')
    })

    it('should concatenate three segments', () => {
      expect(resolvePrefixSegments(['a', 'b', 'c'], 'query')).toBe('a[b][c]')
    })

    it('should apply string segments to any handler type', () => {
      const segments: ContextStoragePrefixSegment[] = ['tables']
      expect(resolvePrefixSegments(segments, 'query')).toBe('tables')
      expect(resolvePrefixSegments(segments, 'localStorage')).toBe('tables')
    })
  })

  describe('object segments (per-handler)', () => {
    it('should resolve segment for matching handler type', () => {
      const segments: ContextStoragePrefixSegment[] = [{ query: 'q-prefix' }]
      expect(resolvePrefixSegments(segments, 'query')).toBe('q-prefix')
    })

    it('should skip segment for non-matching handler type', () => {
      const segments: ContextStoragePrefixSegment[] = [{ query: 'q-prefix' }]
      expect(resolvePrefixSegments(segments, 'localStorage')).toBe('')
    })

    it('should resolve different prefixes for different handlers', () => {
      const segments: ContextStoragePrefixSegment[] = [
        { query: 'url-tables', localStorage: 'ls-tables' },
      ]
      expect(resolvePrefixSegments(segments, 'query')).toBe('url-tables')
      expect(resolvePrefixSegments(segments, 'localStorage')).toBe('ls-tables')
    })

    it('should return empty for unknown handler type', () => {
      const segments: ContextStoragePrefixSegment[] = [{ query: 'q-prefix' }]
      expect(resolvePrefixSegments(segments, undefined)).toBe('')
    })
  })

  describe('mixed segments', () => {
    it('should concatenate string and object segments', () => {
      const segments: ContextStoragePrefixSegment[] = ['tables', { query: 'first' }]
      expect(resolvePrefixSegments(segments, 'query')).toBe('tables[first]')
    })

    it('should skip non-matching object segments in the chain', () => {
      const segments: ContextStoragePrefixSegment[] = ['tables', { query: 'first' }]
      // localStorage handler should only get 'tables' (object segment doesn't match)
      expect(resolvePrefixSegments(segments, 'localStorage')).toBe('tables')
    })

    it('should handle complex stacking scenario', () => {
      const segments: ContextStoragePrefixSegment[] = [
        'app',
        { query: 'page1', localStorage: 'settings' },
        'data',
      ]
      expect(resolvePrefixSegments(segments, 'query')).toBe('app[page1][data]')
      expect(resolvePrefixSegments(segments, 'localStorage')).toBe('app[settings][data]')
    })
  })
})
