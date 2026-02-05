import type { LocationQuery } from 'vue-router'
import { isEqual } from 'lodash'
import { serializeParams } from './helpers'

export interface BuildQueryItem {
  /** Already resolved item data (output of toValue) */
  data: Record<string, unknown>
  /** Serialized initial data snapshot */
  initialQueryData: LocationQuery
  prefix?: string
  onlyChanges?: boolean
  preserveEmptyState?: boolean
  causer?: string
}

export interface BuildQueryInput {
  items: BuildQueryItem[]
  currentQuery: LocationQuery | undefined
  routeQuery: LocationQuery
  preserveUnusedKeys: boolean
  preserveEmptyState: boolean
  onlyChanges: boolean
  emptyPlaceholder: string
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

  input.items.forEach((item) => {
    const { prefix, onlyChanges = input.onlyChanges } = item
    let preserveEmptyState = item.preserveEmptyState ?? input.preserveEmptyState

    const patch = serializeParams(item.data, { prefix })

    // Remove keys that have the same value as initial
    if (onlyChanges) {
      if (preserveEmptyState) {
        preserveEmptyState = false
        warnings.push('[vue-context-storage] preserveEmptyState is not supported with onlyChanges')
      }

      Object.keys(patch).forEach((key) => {
        if (isEqual(patch[key], item.initialQueryData[key])) {
          delete patch[key]
        }
      })
    }

    const patchKeys = Object.keys(patch)

    // If there are key intersections between the query and the patch, a warning is issued.
    // Patches should not overwrite each other, otherwise, upon reload, an incorrect value will be restored.
    patchKeys.forEach((key) => {
      if (newQueryRaw.hasOwnProperty(key)) {
        warnings.push(
          `[vue-context-storage] Key ${key} is already present, overriding ` + (item.causer || ''),
        )
      }
    })

    if (!patchKeys.length && preserveEmptyState) {
      patch[prefix || input.emptyPlaceholder] = null
    }

    Object.assign(newQueryRaw, patch)
  })

  let newQuery = { ...newQueryRaw }

  /*
   * It will not delete from the query the keys that are not used in the patch.
   *
   * It will only work if the registered item has a transform, otherwise without
   * it - all keys are dumped into item.data during the initial fill from initialState
   */
  if (input.preserveUnusedKeys) {
    newQuery = { ...input.routeQuery, ...newQuery }
  }

  if (input.currentQuery !== undefined) {
    // Perform a diff of keys between currentQuery and newQueryRaw, and remove the keys that are in currentQuery but not in newQueryRaw.
    // This is necessary to ensure that the query string does not contain keys that are no longer used.
    Object.keys(input.currentQuery).forEach((key) => {
      if (!newQueryRaw.hasOwnProperty(key)) {
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
