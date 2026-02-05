import { merge, omit } from 'lodash'

export interface ComputeSyncStateInput<T extends Record<string, unknown>> {
  /** Deserialized state from URL query (output of deserializeParams) */
  deserializedState: Record<string, unknown>
  /** Current state of the item (already unwrapped from reactive) */
  itemState: T
  /** Snapshot of data at registration time */
  initialData: T
  prefix?: string
  onlyChanges: boolean
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

  let wasEmptyState = false

  if (stateBaseKeys.length === 1 && state[input.emptyPlaceholder] === null) {
    state = omit(state, [input.emptyPlaceholder]) as Record<string, unknown>
    wasEmptyState = true
  }

  if (input.onlyChanges && !wasEmptyState) {
    state = merge({}, state, omit(input.itemState as Record<string, unknown>, stateBaseKeys))
  }

  return { type: 'sync', data: state }
}
