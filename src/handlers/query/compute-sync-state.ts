import { omit } from 'lodash'

export interface ComputeSyncStateInput<T extends Record<string, unknown>> {
  /** Deserialized state from URL query (output of deserializeParams) */
  deserializedState: Record<string, unknown>
  /** Snapshot of data at registration time */
  initialData: T
  prefix?: string
  emptyPlaceholder: string
}

export type ComputeSyncStateResult<T extends Record<string, unknown>> =
  | { type: 'none' }
  | { type: 'reset'; data: T }
  | { type: 'sync'; data: Record<string, unknown> }

export function computeSyncState<T extends Record<string, unknown>>(
  input: ComputeSyncStateInput<T>,
): ComputeSyncStateResult<T> {
  let state: Record<string, unknown> | undefined | null = input.deserializedState

  if (typeof input.prefix === 'string' && input.prefix.length > 0) {
    state = state[input.prefix] as Record<string, unknown> | undefined | null
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

  return { type: 'sync', data: state as Record<string, unknown> }
}
