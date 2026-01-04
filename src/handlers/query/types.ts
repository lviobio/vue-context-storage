import { LocationQueryValue } from 'vue-router'
import { MaybeRefOrGetter, UnwrapNestedRefs, WatchHandle } from 'vue'
import { ContextStorageHandler, RegisterBaseOptions } from '../../handlers.ts'

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
   * If enabled - empty state will be preserved in query.
   *
   * Useful, when you have default values, and want to preserve empty state in query.
   * @example
   * ```
   * Options: {preserveEmptyState: true, prefix: 'filters'}
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
   * Options: {preserveEmptyState: false, prefix: 'filters'}
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
   * Prefix in query string.
   *
   * @example
   * ```
   * filters, table-1[filters], table-2[filters]
   * ```
   */
  prefix?: string
  transform?: (
    deserialized: DeepTransformValuesToLocationQueryValue<UnwrapNestedRefs<T>>,
    initialData: T,
  ) => UnwrapNestedRefs<T>
}

export interface RegisterQueryHandlerOptions<T>
  extends RegisterBaseOptions, RegisterQueryHandlerBaseOptions<T> {}

export interface IContextStorageQueryHandler extends ContextStorageHandler {
  register: <T extends Record<string, unknown>>(
    data: MaybeRefOrGetter<T>,
    options: RegisterQueryHandlerOptions<T>,
  ) => () => void
}

export interface ContextStorageQueryRegisteredItem<T extends Record<string, unknown>> {
  data: MaybeRefOrGetter<T>
  initialData: T
  options: RegisterQueryHandlerOptions<T>
  watchHandle: WatchHandle
}
