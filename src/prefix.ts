import type { InjectionKey, MaybeRefOrGetter } from 'vue'
import { contextStoragePrefixSegments } from './symbols'

/**
 * A prefix segment provided by a `<ContextStoragePrefix>` component.
 *
 * - `string` — applies the same prefix to all handler types
 * - `Record<string, string>` — per-handler prefix (keys are handler type names, e.g. `'query'`, `'localStorage'`)
 */
export type ContextStoragePrefixSegment = string | Partial<Record<string, string>>

/**
 * Concatenates two prefix parts using bracket notation.
 *
 * @example
 * joinPrefix('tables', 'first')   // 'tables[first]'
 * joinPrefix('', 'first')         // 'first'
 * joinPrefix('tables', '')        // 'tables'
 */
function joinPrefix(left: string, right: string): string {
  if (!left) return right
  if (!right) return left
  return `${left}[${right}]`
}

/**
 * Splits a bracket-notation prefix into parts.
 *
 * @example
 * parsePrefixParts('tables[first]')  // ['tables', 'first']
 * parsePrefixParts('simple')         // ['simple']
 * parsePrefixParts('')               // []
 */
export function parsePrefixParts(prefix: string): string[] {
  if (!prefix) return []
  return prefix.split(/\[|\]/).filter(Boolean)
}

/**
 * Gets a nested value from an object using bracket-notation prefix path.
 * Returns `undefined` if any part of the path is missing.
 *
 * @example
 * getByPrefix({ a: { b: { x: 1 } } }, 'a[b]')  // { x: 1 }
 * getByPrefix({ a: 1 }, 'a')                     // 1
 */
export function getByPrefix(obj: Record<string, unknown>, prefix: string): unknown {
  const parts = parsePrefixParts(prefix)
  let current: unknown = obj
  for (const part of parts) {
    if (current === undefined || current === null || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

/**
 * Sets a nested value in an object using bracket-notation prefix path.
 * Creates intermediate objects as needed.
 *
 * @example
 * setByPrefix({}, 'a[b]', { x: 1 })  // { a: { b: { x: 1 } } }
 * setByPrefix({}, 'a', { x: 1 })     // { a: { x: 1 } }
 */
export function setByPrefix(obj: Record<string, unknown>, prefix: string, value: unknown): void {
  const parts = parsePrefixParts(prefix)
  let current = obj
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]
    if (!current[part] || typeof current[part] !== 'object') {
      current[part] = {}
    }
    current = current[part] as Record<string, unknown>
  }
  current[parts[parts.length - 1]] = value
}

/**
 * Resolves a collected array of prefix segments into a single prefix string
 * for a specific handler type. The segments are concatenated in order using
 * bracket notation (`a[b][c]`).
 *
 * @param segments — array provided via inject (stacked by nested ContextStoragePrefix components)
 * @param handlerType — handler type name (e.g. 'query', 'localStorage')
 */
export const contextStoragePrefixSegmentsInjectKey: InjectionKey<
  MaybeRefOrGetter<ContextStoragePrefixSegment[]>
> = contextStoragePrefixSegments

export function resolvePrefixSegments(
  segments: ContextStoragePrefixSegment[],
  handlerType: string | undefined,
): string {
  let combined = ''

  for (const segment of segments) {
    let value: string | undefined

    if (typeof segment === 'string') {
      value = segment
    } else if (handlerType && segment[handlerType] !== undefined) {
      value = segment[handlerType]
    }

    if (value) {
      combined = joinPrefix(combined, value)
    }
  }

  return combined
}
