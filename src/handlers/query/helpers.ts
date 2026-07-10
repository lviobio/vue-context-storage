import type { LocationQuery } from 'vue-router'

/**
 * Controls how flat (scalar) arrays are written to the URL query.
 *
 * - `'repeat'` (default): one query entry per value — `?ids=1&ids=2&ids=3`.
 *   Round-trips natively because vue-router restores repeated keys as arrays.
 * - `'comma'`: a single comma-joined value — `?ids=1,2,3`. Produces shorter,
 *   more readable URLs, but the array-ness is lost on the URL (a comma-joined
 *   string is indistinguishable from a plain string), so restoring an array
 *   requires a `schema` or `transform` to know the field is an array.
 */
export type QueryArrayFormat = 'repeat' | 'comma'

export interface QuerySerializeOptions {
  /**
   * How flat (scalar) arrays are written to the URL. Default: `'repeat'`.
   */
  arrayFormat?: QueryArrayFormat

  /**
   * Separator used when `arrayFormat` is `'comma'`. Default: `','`.
   */
  arraySeparator?: string
}

export interface SerializeOptions extends QuerySerializeOptions {
  /**
   * Custom key prefix for serialized keys.
   * @example
   * - key: 'filters' => 'filters[field]'
   * - key: 'search' => 'search[field]'
   * - key: '' => 'field' (no prefix)
   */
  key?: string
}

/**
 * The serialize options after the handler has resolved them — the factory-level
 * and per-register `serialize` options merged, with defaults applied
 * (`arrayFormat: 'repeat'`, `arraySeparator: ','`). This is exactly what the
 * query handler passes to {@link serializeParams} (and to a custom
 * `serializer.serialize`), so `arrayFormat` and `arraySeparator` are always
 * present — `key` is present only when the registration sets one.
 */
export interface ResolvedSerializeOptions {
  key?: string
  arrayFormat: QueryArrayFormat
  arraySeparator: string
}

/**
 * Escapes the separator (and the escape character itself) inside a single
 * array element so that a value which *contains* the separator does not get
 * split into multiple elements on the way back.
 *
 * The backslash (`\`) is the escape character. It is escaped first (so an
 * existing backslash becomes `\\`), then every occurrence of the separator is
 * prefixed with a backslash.
 *
 * @example
 * escapeArrayValue('Some value, with comma', ',') // => 'Some value\\, with comma'
 */
function escapeArrayValue(value: string, separator: string): string {
  // Fast path: nothing to escape (the common case — plain ids/tags/slugs).
  if (!value.includes(separator) && !value.includes('\\')) return value

  return value
    .split('\\')
    .join('\\\\')
    .split(separator)
    .join('\\' + separator)
}

/**
 * Joins array elements for the `'comma'` array format, escaping any separator
 * characters inside the elements (see {@link escapeArrayValue}). The inverse of
 * {@link splitArrayValue}.
 */
export function joinArrayValues(values: readonly unknown[], separator: string): string {
  return values.map((value) => escapeArrayValue(String(value), separator)).join(separator)
}

/**
 * Splits a `'comma'`-formatted array value back into its elements, honouring
 * backslash escapes produced by {@link joinArrayValues}. A separator preceded by
 * a backslash is treated as a literal part of the value, not a delimiter, so
 * elements that legitimately contain the separator round-trip intact.
 *
 * @example
 * splitArrayValue('Some value\\, with comma,second', ',')
 * // => ['Some value, with comma', 'second']
 */
export function splitArrayValue(value: string, separator: string): string[] {
  // An empty separator cannot delimit anything — return the value as-is.
  if (separator.length === 0) return [value]

  // Fast path: no escape marker present, so no element could have needed
  // escaping (joinArrayValues only ever emits `\` when it escapes something)
  // — a native split is equivalent and far faster than the manual parse below.
  if (!value.includes('\\')) return value.split(separator)

  const result: string[] = []
  let current = ''
  let i = 0

  while (i < value.length) {
    if (value[i] === '\\' && i + 1 < value.length) {
      // The next character is escaped — take it literally.
      current += value[i + 1]
      i += 2
      continue
    }

    if (value.startsWith(separator, i)) {
      result.push(current)
      current = ''
      i += separator.length
      continue
    }

    current += value[i]
    i += 1
  }

  result.push(current)
  return result
}

/**
 * Serializes filter parameters into a URL-friendly format.
 *
 * @param params - Raw parameters object to serialize
 * @param options - Serialization options
 * @returns Serialized parameters with prefixed keys
 *
 * @example
 * // With default prefix 'filters'
 * serializeFiltersParams({ status: 'active', tags: ['a', 'b'] })
 * // => { 'filters[status]': 'active', 'filters[tags]': 'a,b' }
 *
 * @example
 * // With custom prefix
 * serializeFiltersParams({ name: 'John', all: true }, { prefix: 'search' })
 * // => { 'search[name]': 'John', 'search[all]': '1' }
 *
 * @example
 * // Without prefix
 * serializeFiltersParams({ page: 1, all: false }, { prefix: '' })
 * // => { 'page': '1', 'all': '0' }
 */
export function serializeParams(
  params: Record<string, unknown>,
  options: SerializeOptions = {},
): LocationQuery {
  const { key: prefix = '', arrayFormat = 'repeat', arraySeparator = ',' } = options

  const result: LocationQuery = {}

  Object.keys(params).forEach((key) => {
    const value = params[key]

    // Skip undefined values (remove key from result)
    if (value === undefined) {
      return
    }

    // Skip empty arrays
    if (Array.isArray(value) && value.length === 0) {
      return
    }

    // Format the key with prefix (or without if prefix is empty)
    const formattedKey = prefix ? `${prefix}[${key}]` : key

    // Preserve empty strings and null as-is
    if (value === '' || value === null) {
      result[formattedKey] = value
      return
    }

    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        const hasObjects = value.some(
          (item) => typeof item === 'object' && item !== null && !Array.isArray(item),
        )

        if (hasObjects) {
          // Serialize arrays of objects as indexed keys: items[0][name]=A&items[1][name]=B
          const indexed: Record<string, unknown> = {}
          value.forEach((item, i) => {
            indexed[String(i)] = item
          })
          Object.assign(
            result,
            serializeParams(indexed, {
              ...options,
              key: formattedKey,
            }),
          )
        } else if (arrayFormat === 'comma') {
          // Serialize flat arrays as a single comma-joined value: a=1,2,3
          // Separators inside values are backslash-escaped so they survive the round-trip.
          result[formattedKey] = joinArrayValues(value, arraySeparator)
        } else {
          // Serialize flat arrays directly: a=1&a=2&a=3
          result[formattedKey] = value.map(String)
        }
      } else {
        Object.assign(
          result,
          serializeParams(value as Record<string, unknown>, {
            ...options,
            key: formattedKey,
          }),
        )
      }
    } else if (typeof value === 'boolean') {
      result[formattedKey] = value ? '1' : '0'
    } else {
      result[formattedKey] = String(value)
    }
  })

  return result
}

/**
 * Deserializes query parameters from a URL-friendly format back to an object.
 *
 * @param params - Serialized parameters object
 * @returns Deserialized parameters object
 *
 * @example
 * deserializeParams({ 'filters[status]': 'active', search: 'test' })
 * // => { filters: {status: 'active'}, search: 'test' }
 */
export function deserializeParams(params: Record<string, any>) {
  return Object.keys(params).reduce<Record<string, any>>((acc, key) => {
    const value = params[key]

    // Parse nested structure: 'filters[status]' -> { filters: { status: value } }
    const bracketMatch = key.match(/^([^[]+)\[(.+)]$/)

    if (bracketMatch) {
      const [, rootKey, nestedPath] = bracketMatch

      // Initialize root object if needed
      if (!acc[rootKey]) {
        acc[rootKey] = {}
      }

      // Parse nested path: 'created_at][from' -> ['created_at', 'from']
      const pathParts = nestedPath.split('][')

      // Navigate/create nested structure
      let current = acc[rootKey]
      for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i]
        if (!current[part]) {
          current[part] = {}
        }
        current = current[part]
      }

      // Set the final value
      const finalKey = pathParts[pathParts.length - 1]
      current[finalKey] = value
    } else {
      // No brackets - simple key
      acc[key] = value
    }

    return acc
  }, {}) as Record<string, unknown>
}
