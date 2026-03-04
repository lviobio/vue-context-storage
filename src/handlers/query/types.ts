import type { LocationQuery, LocationQueryValue } from 'vue-router'
import type { MaybeRefOrGetter, UnwrapNestedRefs, WatchHandle } from 'vue'
import type { RegisterBaseOptions } from '../../handlers'

export type QueryValue = LocationQueryValue | LocationQueryValue[]

// A recursive type that transforms all properties to CustomType
export type DeepTransformValuesToLocationQueryValue<T> = {
  [K in keyof T]?: T[K] extends object // Check if the property is an object
    ? // Exclude Array from being treated as an object for recursion
      T[K] extends Array<any>
      ? QueryValue // Arrays will just become the CustomType (or you could handle them differently)
      : DeepTransformValuesToLocationQueryValue<T[K]> // Recursively apply the type to nested objects
    : QueryValue // Non-object (leaf) properties get the CustomType
}

interface QueryHandlerSharedOptions {
  /**
   * Default: false
   *
   * If enabled - only values that differ from the initial state will be written to URL.
   * This keeps URLs clean by omitting default values.
   *
   * @example
   * ```
   * Options: { onlyChanges: true }
   *
   * Initial state: { page: 1, search: '', with_trashed: false }
   * Current state: { page: 1, search: 'test', with_trashed: true }
   *
   * URL will be: ?search=test&with_trashed=1
   *
   * The page parameter is omitted because it equals the initial value.
   * ```
   */
  onlyChanges?: boolean

  /**
   * Default: false
   *
   * If enabled - empty state will be preserved in query.
   *
   * Useful, when you have default values, and want to preserve empty state in query.
   * @example
   * ```
   * Options: {preserveEmptyState: true, key: 'filters'}
   *
   * When filters are empty we will get this in query string:
   *
   * /list?filters
   *
   * After page reload state will be not restored to default
   * ```
   *
   * @example
   * ```
   * Options: {preserveEmptyState: false, key: 'filters'}
   *
   * When filters are empty we will get this in query string:
   *
   * /list
   *
   * After page reload state will be restored to default
   * ```
   *
   * @example
   * ```
   * Options: {preserveEmptyState: true}
   *
   * When filters are empty we will get this in query string:
   *
   * /list?_
   *
   * After page reload state will be not restored to default.
   * Underscore (_) is default value for emptyPlaceholder option
   * ```
   */
  preserveEmptyState?: boolean

  /**
   * Default: true
   *
   * If transform option is not passed, ref will be merged with query only by keys that exists in ref.
   */
  mergeOnlyExistingKeysWithoutTransform?: boolean
}

export interface QueryHandlerBaseOptions extends QueryHandlerSharedOptions {
  /**
   * Default: replace
   *
   * Vue-router navigate mode.
   * Use push if you want to add new query to history.
   * Use replace if you want to replace current query without adding to history.
   */
  mode?: 'replace' | 'push'

  /**
   * Default: _
   *
   * Placeholder for empty state, used when preserveEmptyState is true and all ref values are empty.
   */
  emptyPlaceholder?: string

  /**
   * Default: false
   *
   * If enabled - unused keys will be preserved in query.
   * Unused keys are keys, that are not exists in ref.
   */
  preserveUnusedKeys?: boolean
}

export interface RegisterQueryHandlerBaseOptions<T> extends QueryHandlerSharedOptions {
  /**
   * Key in query string.
   *
   * @example
   * ```
   * filters, table-1[filters], table-2[filters]
   * ```
   */
  key?: string

  /**
   * Transform function to convert deserialized query parameters to the expected type.
   *
   * Note: If `schema` is provided, it takes priority over `transform`.
   */
  transform?: (
    deserialized: DeepTransformValuesToLocationQueryValue<UnwrapNestedRefs<T>>,
    initialData: T,
  ) => UnwrapNestedRefs<T>

  /**
   * Additional default values for `onlyChanges` comparison.
   *
   * When `onlyChanges` is enabled, a key is omitted from the URL if its current value
   * equals the initial snapshot **or** a value specified here.
   *
   * This is useful when the initial reactive data contains `undefined` for a field,
   * but you also want a specific value (e.g. `1`) to be treated as a default
   * and not appear in the query string.
   *
   * @example
   * ```ts
   * const data = ref({ page: undefined as number | undefined })
   *
   * useContextStorage('query', data, {
   *   key: 'filters',
   *   onlyChanges: true,
   *   additionalDefaultData: { page: 1 },
   * })
   *
   * // page=undefined → not in query (matches initial)
   * // page=1         → not in query (matches additionalDefaultData)
   * // page=2         → appears in query
   * ```
   */
  additionalDefaultData?: Partial<UnwrapNestedRefs<T>>
}

export interface RegisterQueryHandlerOptions<T>
  extends RegisterBaseOptions<T>, RegisterQueryHandlerBaseOptions<T> {}

export interface ContextStorageQueryRegisteredItem<T extends Record<string, unknown>> {
  data: MaybeRefOrGetter<T>
  initialData: T
  initialQueryData: LocationQuery
  additionalDefaultQueryData: LocationQuery | undefined
  options: RegisterQueryHandlerOptions<T>
  watchHandle: WatchHandle
}
