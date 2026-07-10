function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

/**
 * Deep equality for JSON-like data (the shape of query/storage state:
 * plain objects, arrays, and primitives). Not a general-purpose `isEqual` —
 * doesn't special-case Date/Map/Set/RegExp since those never appear here.
 */
export function isEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a !== a && b !== b) return true // both NaN

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false
    return a.every((item, i) => isEqual(item, b[i]))
  }

  if (isPlainObject(a) && isPlainObject(b)) {
    const aKeys = Object.keys(a)
    const bKeys = Object.keys(b)
    if (aKeys.length !== bKeys.length) return false
    return aKeys.every(
      (key) => Object.prototype.hasOwnProperty.call(b, key) && isEqual(a[key], b[key]),
    )
  }

  return false
}

/**
 * Recursively merges plain-object sources into `target` (mutated in place),
 * later sources winning on conflicts. `undefined` source values are skipped
 * so they don't blank out an existing value. Unlike lodash `merge`, arrays
 * are replaced wholesale rather than merged by index — callers here only
 * ever need "source object wins", and array elements are never merged.
 */
export function mergeDeep<T extends Record<string, unknown>>(
  target: Record<string, unknown>,
  ...sources: Array<Record<string, unknown> | undefined | null>
): T {
  for (const source of sources) {
    if (!source) continue
    for (const key of Object.keys(source)) {
      const sourceValue = source[key]
      if (sourceValue === undefined) continue
      const targetValue = target[key]
      target[key] =
        isPlainObject(targetValue) && isPlainObject(sourceValue)
          ? mergeDeep({ ...targetValue }, sourceValue)
          : sourceValue
    }
  }
  return target as T
}

export function pick<T extends Record<string, unknown>>(obj: T, keys: (keyof T)[]): Partial<T> {
  const result: Partial<T> = {}
  for (const key of keys) {
    if (key in obj) result[key] = obj[key]
  }
  return result
}

export function omit<T extends Record<string, unknown>>(obj: T, keys: (keyof T)[]): Partial<T> {
  const keySet = new Set(keys)
  const result: Partial<T> = {}
  for (const key of Object.keys(obj) as (keyof T)[]) {
    if (!keySet.has(key)) result[key] = obj[key]
  }
  return result
}
