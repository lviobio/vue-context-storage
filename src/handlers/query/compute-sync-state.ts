import { omit } from 'lodash'

export interface ComputeSyncStateInput<T extends Record<string, unknown>> {
  /** Deserialized state from URL query (output of deserializeParams) */
  deserializedState: Record<string, unknown>
  /** Snapshot of data at registration time */
  initialData: T
  key?: string
  emptyPlaceholder: string
}

export type ComputeSyncStateResult<T extends Record<string, unknown>> =
  | { type: 'none' }
  | { type: 'reset'; data: T }
  | { type: 'sync'; data: Record<string, unknown> }

type InitialState = Record<string, unknown> | undefined | null

export function computeSyncState<T extends Record<string, unknown>>(
  input: ComputeSyncStateInput<T>,
): ComputeSyncStateResult<T> {
  let state: InitialState = input.deserializedState

  if (typeof input.key === 'string' && input.key.length > 0) {
    // Support nested bracket keys (e.g. 'tables[first]' → traverse state.tables.first)
    const parts = input.key.split(/[\[\]]/).filter(Boolean)
    for (const part of parts) {
      if (state === undefined || state === null) break
      state = (state as Record<string, unknown>)[part] as InitialState
    }
  }

  if (state === undefined) {
    return { type: 'none' }
  }

  /**
   * null can be if query parameter only has a name without a value sign (e.g. /?name)
   */
  if (state === null) {
    return { type: 'none' }
  }

  /**
   * Initial state keys before any manipulation
   */
  const stateBaseKeys = Object.keys(state)

  /**
   * If the data is empty, return the initial value.
   *
   * This can happen when directly navigating to a route, for example through a menu item.
   */
  if (!stateBaseKeys.length) {
    return { type: 'reset', data: input.initialData }
  }

  if (stateBaseKeys.length === 1 && state[input.emptyPlaceholder] === null) {
    state = omit(state, [input.emptyPlaceholder]) as Record<string, unknown>
  }

  /**
   * For unkeyed items: if none of the URL keys overlap with the item's known keys,
   * the URL effectively has no data for this item (e.g. external navigation set ?foo=bar
   * but the item manages name, title, etc.). Treat as reset to initial values.
   *
   * This check runs after empty placeholder removal so that `?_` (preserveEmptyState)
   * is correctly handled as sync with empty data rather than a false-positive reset.
   */
  if (!input.key) {
    const remainingKeys = Object.keys(state)
    const initialDataKeys = Object.keys(input.initialData)
    const hasOverlap = remainingKeys.some((k) => initialDataKeys.includes(k))
    if (!hasOverlap && remainingKeys.length > 0) {
      return { type: 'reset', data: input.initialData }
    }
  }

  return { type: 'sync', data: state as Record<string, unknown> }
}
