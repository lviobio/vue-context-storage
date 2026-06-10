import type { LocationQuery, LocationQueryValue } from 'vue-router'
import type { MaybeRefOrGetter, UnwrapNestedRefs, WatchHandle } from 'vue'
import type { RegisterBaseOptions } from '../../handlers'
import type { QuerySerializeOptions, ResolvedSerializeOptions } from './helpers'

export type QueryValue = LocationQueryValue | LocationQueryValue[]

/**
 * A fully custom serializer pair that replaces the built-in
 * `serializeParams` / `deserializeParams` for the query handler.
 *
 * Set it on the handler factory (`createQueryHandler({ serializer })`) to take
 * full control of how reactive state is encoded to / decoded from the URL query
 * (e.g. a `qs`-style format, base64, JSON, or custom escaping).
 *
 * Contract:
 * - `serialize` and `deserialize` MUST be mutual inverses.
 * - They must preserve the same per-`key` nesting the standard pair uses, i.e.
 *   `deserialize(serialize(data, { key }))` reproduces `{ [key]: data }` (and
 *   `{ ...data }` when no `key` is given). The handler relies on this to extract
 *   each registration's subtree, diff against baselines, and drive `onlyChanges`.
 * - `serialize` receives the fully {@link ResolvedSerializeOptions resolved}
 *   options — the factory-level and per-register `serialize` options merged with
 *   defaults — so `key`, `arrayFormat` and `arraySeparator` are all available.
 *   A custom implementation may honour the array options (e.g. respect
 *   `arrayFormat: 'comma'`) or own the encoding entirely and ignore them.
 * - `deserialize` runs on the whole route query before per-registration
 *   extraction, so it does NOT receive options — the author fixes the decoding
 *   format (and must mirror whatever `serialize` produced).
 *
 * `deserialize` output still flows through `schema` / `transform` coercion, so
 * return already-typed values (numbers, arrays) or URL-style strings the
 * standard coercion understands.
 */
export interface QuerySerializer {
  serialize: (params: Record<string, unknown>, options: ResolvedSerializeOptions) => LocationQuery
  deserialize: (query: Record<string, any>) => Record<string, any>
}

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

  /**
   * Options for the standard query serializer.
   *
   * Use this to store flat arrays as a single comma-joined value instead of
   * repeated keys:
   *
   * @example
   * ```ts
   * createQueryHandler({ serialize: { arrayFormat: 'comma' } })
   *
   * // { ids: [1, 2, 3] } → ?ids=1,2,3   (instead of ?ids=1&ids=2&ids=3)
   * ```
   *
   * Can be set on the handler factory (applies to every registered context) or
   * per `useContextStorage('query', ...)` call (overrides the factory value).
   *
   * Restoring a comma-joined array back into an array requires a `schema` or a
   * `transform` (the comma string is indistinguishable from a plain string on
   * the URL). The built-in `schema` coercion and the `asArray` / `asNumberArray`
   * transform helpers split on `arraySeparator` automatically.
   */
  serialize?: QuerySerializeOptions
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
   * Default: true
   *
   * If enabled - unused keys will be preserved in query.
   * Unused keys are keys, that are not exists in ref.
   *
   * When true, query parameters added by other code (e.g. direct router.push/replace calls)
   * will not be removed by the handler. Set to false only if you want the handler
   * to have exclusive ownership of all query parameters.
   */
  preserveUnusedKeys?: boolean

  /**
   * A fully custom serializer pair replacing the built-in `serializeParams` /
   * `deserializeParams`. Factory-level only — owns the entire URL encoding.
   *
   * When set, the built-in `serialize` options (`arrayFormat` / `arraySeparator`)
   * no longer apply. See {@link QuerySerializer} for the contract.
   *
   * @example
   * ```ts
   * import qs from 'qs'
   *
   * createQueryHandler({
   *   serializer: {
   *     serialize: (data, { key } = {}) =>
   *       qs.parse(qs.stringify(key ? { [key]: data } : data, { encode: false })),
   *     deserialize: (query) => query,
   *   },
   * })
   * ```
   */
  serializer?: QuerySerializer
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
  schemaMetaDefaultQueryData: LocationQuery | undefined
  schemaDefaultQueryData: LocationQuery | undefined
  options: RegisterQueryHandlerOptions<T>
  watchHandle: WatchHandle
}
