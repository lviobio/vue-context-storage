import type { LocationQuery } from 'vue-router'

export interface SerializeOptions {
  /**
   * Custom prefix for serialized keys.
   * @example
   * - prefix: 'filters' => 'filters[key]'
   * - prefix: 'search' => 'search[key]'
   * - prefix: '' => 'key' (no prefix)
   */
  prefix?: string
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
  const { prefix = '' } = options

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
        // Serialize arrays directly: a=1&a=2&a=3
        result[formattedKey] = value.map(String)
      } else {
        Object.assign(
          result,
          serializeParams(value as Record<string, unknown>, {
            ...options,
            prefix: formattedKey,
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
