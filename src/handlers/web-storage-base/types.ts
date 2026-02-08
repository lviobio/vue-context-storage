import type { MaybeRefOrGetter, UnwrapNestedRefs, WatchHandle } from 'vue'
import type { RegisterBaseOptions } from '../../handlers'

export interface WebStorageHandlerBaseOptions {
  /**
   * Default: true for localStorage, false for sessionStorage
   *
   * If enabled - storage events will be listened to for cross-tab synchronization.
   * Only works with localStorage (sessionStorage is per-tab).
   */
  listenToStorageEvents?: boolean
}

export interface RegisterWebStorageHandlerBaseOptions<T> {
  key?: string

  /**
   * Optional prefix for nested data within the storage key.
   * When provided, data will be stored under this prefix within the main storage object.
   */
  prefix?: string

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
