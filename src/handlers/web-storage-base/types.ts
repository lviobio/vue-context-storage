import type { MaybeRefOrGetter, UnwrapNestedRefs, WatchHandle } from 'vue'
import type { RegisterBaseOptions } from '../../handlers'

export interface WebStorageHandlerBaseOptions {
  /**
   * Default: true
   *
   * If enabled - storage events will be listened to so external changes are synced
   * back into the reactive data. For localStorage this covers other tabs; for
   * sessionStorage it covers other contexts of the same session (iframes,
   * `window.open` windows) and manual edits via DevTools.
   */
  listenToStorageEvents?: boolean
}

export interface RegisterWebStorageHandlerBaseOptions<T> {
  key?: string

  /**
   * Transform function to convert deserialized storage data to the expected type.
   *
   * Note: If `schema` is provided, it takes priority over `transform`.
   */
  transform?: (deserialized: Record<string, unknown>, initialData: T) => UnwrapNestedRefs<T>

  /**
   * Custom serializer function. Defaults to JSON.stringify.
   */
  serializer?: (data: T) => string

  /**
   * Custom deserializer function. Defaults to JSON.parse.
   */
  deserializer?: (str: string) => unknown
}

export interface RegisterWebStorageHandlerOptions<T>
  extends RegisterBaseOptions<T>, RegisterWebStorageHandlerBaseOptions<T> {}

export interface ContextStorageWebStorageRegisteredItem<T extends Record<string, unknown>> {
  data: MaybeRefOrGetter<T>
  initialData: T
  options: RegisterWebStorageHandlerOptions<T>
  watchHandle: WatchHandle
}
