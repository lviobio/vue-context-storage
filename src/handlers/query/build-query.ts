import type { LocationQuery } from 'vue-router'
import { isEqual } from 'lodash'
import { serializeParams, type QueryArrayFormat, type ResolvedSerializeOptions } from './helpers'

export interface BuildQueryItem {
  /** Already resolved item data (output of toValue) */
  data: Record<string, unknown>
  /** Serialized initial data snapshot */
  initialQueryData: LocationQuery
  /** Serialized option-level additionalDefaultData */
  additionalDefaultQueryData?: LocationQuery
  /** Serialized schema-meta additionalDefaultData (checked independently of option-level) */
  schemaMetaDefaultQueryData?: LocationQuery
  /** Serialized schema `.default()` values for extended onlyChanges comparison */
  schemaDefaultQueryData?: LocationQuery
  key?: string
  onlyChanges?: boolean
  preserveEmptyState?: boolean
  causer?: string
  /** How flat arrays are serialized to the URL (default: 'repeat') */
  arrayFormat?: QueryArrayFormat
  /** Separator used when arrayFormat is 'comma' (default: ',') */
  arraySeparator?: string
}

export interface BuildQueryInput {
  items: BuildQueryItem[]
  currentQuery: LocationQuery | undefined
  routeQuery: LocationQuery
  preserveUnusedKeys: boolean
  preserveEmptyState: boolean
  onlyChanges: boolean
  emptyPlaceholder: string
  /**
   * Serializer used to turn each item's data into a query patch. Defaults to the
   * built-in {@link serializeParams}; the query handler passes a custom one when
   * `createQueryHandler({ serializer })` is configured. Always invoked with the
   * fully resolved options (`key`, `arrayFormat`, `arraySeparator`).
   */
  serialize?: (params: Record<string, unknown>, options: ResolvedSerializeOptions) => LocationQuery
}

export interface BuildQueryResult {
  newQuery: LocationQuery
  newQueryRaw: LocationQuery
  warnings: string[]
}

function sortQueryByReference(query: LocationQuery, ...references: LocationQuery[]): LocationQuery {
  const sorted: LocationQuery = {}

  const referenceKeys = new Set<string>()

  references.forEach((reference) => {
    Object.keys(reference).forEach((key) => {
      referenceKeys.add(key)
    })
  })

  referenceKeys.forEach((key) => {
    if (key in query && !(key in sorted)) {
      sorted[key] = query[key]
    }
  })

  Object.keys(query).forEach((key) => {
    if (!(key in sorted)) {
      sorted[key] = query[key]
    }
  })

  return sorted
}

export function buildQuery(input: BuildQueryInput): BuildQueryResult {
  const warnings: string[] = []
  const newQueryRaw: LocationQuery = {}
  const serialize = input.serialize ?? serializeParams

  // Collect all serialized keys that are "owned" by registered items.
  // This is needed so that preserveUnusedKeys only preserves truly external keys,
  // and does not restore owned keys that were stripped by onlyChanges.
  const ownedKeys = new Set<string>()

  input.items.forEach((item) => {
    const { key, onlyChanges = input.onlyChanges } = item
    let preserveEmptyState = item.preserveEmptyState ?? input.preserveEmptyState

    const patch = serialize(item.data, {
      key,
      arrayFormat: item.arrayFormat ?? 'repeat',
      arraySeparator: item.arraySeparator ?? ',',
    })

    // Collect owned keys before onlyChanges filtering removes default-value keys.
    // Also include initialQueryData keys to cover values that became undefined.
    Object.keys(patch).forEach((k) => ownedKeys.add(k))
    Object.keys(item.initialQueryData).forEach((k) => ownedKeys.add(k))

    // Remove keys that have the same value as initial
    if (onlyChanges) {
      if (preserveEmptyState) {
        preserveEmptyState = false
        warnings.push('[vue-context-storage] preserveEmptyState is not supported with onlyChanges')
      }

      Object.keys(patch).forEach((key) => {
        if (
          isEqual(patch[key], item.initialQueryData[key]) ||
          (item.additionalDefaultQueryData &&
            isEqual(patch[key], item.additionalDefaultQueryData[key])) ||
          (item.schemaMetaDefaultQueryData &&
            isEqual(patch[key], item.schemaMetaDefaultQueryData[key])) ||
          (item.schemaDefaultQueryData && isEqual(patch[key], item.schemaDefaultQueryData[key]))
        ) {
          delete patch[key]
        }
      })
    }

    const patchKeys = Object.keys(patch)

    // If there are key intersections between the query and the patch, a warning is issued.
    // Patches should not overwrite each other, otherwise, upon reload, an incorrect value will be restored.
    patchKeys.forEach((key) => {
      if (Object.hasOwn(newQueryRaw, key)) {
        warnings.push(
          `[vue-context-storage] Key ${key} is already present, overriding ` + (item.causer || ''),
        )
      }
    })

    if (!patchKeys.length && preserveEmptyState) {
      patch[key || input.emptyPlaceholder] = null
    }

    Object.assign(newQueryRaw, patch)
  })

  let newQuery = { ...newQueryRaw }

  /*
   * Preserve query keys that are not owned by any registered item.
   * Only truly external keys (e.g. added by other code via router.push) are kept.
   * Owned keys stripped by onlyChanges are NOT restored.
   */
  if (input.preserveUnusedKeys) {
    Object.keys(input.routeQuery).forEach((key) => {
      if (!ownedKeys.has(key) && !Object.hasOwn(newQuery, key)) {
        newQuery[key] = input.routeQuery[key]
      }
    })
  }

  if (input.currentQuery !== undefined) {
    // Perform a diff of keys between currentQuery and newQueryRaw, and remove the keys that are in currentQuery but not in newQueryRaw.
    // This is necessary to ensure that the query string does not contain keys that are no longer used.
    Object.keys(input.currentQuery).forEach((key) => {
      if (!Object.hasOwn(newQueryRaw, key)) {
        delete newQuery[key]
      }
    })
  }

  if (Object.keys(newQuery).length > 1 && newQuery[input.emptyPlaceholder] === null) {
    delete newQuery[input.emptyPlaceholder]
  }

  newQuery = sortQueryByReference(newQuery, newQueryRaw)

  return { newQuery, newQueryRaw, warnings }
}
