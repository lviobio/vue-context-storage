import type { MaybeRefOrGetter, UnwrapNestedRefs, WatchHandle } from 'vue'
import type { ContextStorageHandler, RegisterBaseOptions } from '../../handlers'
import type { HandlerSchema } from '../types'

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
  /**
   * Storage key for this data.
   */
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
   * Zod schema for automatic validation and type coercion.
   *
   * When provided, the schema will be used to parse and validate storage data.
   * This option takes priority over the `transform` option.
   *
   * @example
   * ```typescript
   * import { z } from 'zod'
   *
   * const SettingsSchema = z.object({
   *   theme: z.enum(['light', 'dark']).default('light'),
   *   fontSize: z.number().int().positive().default(14),
   * })
   *
   * useContextStorageLocalStorage(settings, {
   *   key: 'app-settings',
   *   schema: SettingsSchema,
   * })
   * ```
   */
  schema?: HandlerSchema<T>

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
  extends RegisterBaseOptions, RegisterWebStorageHandlerBaseOptions<T> {}

export interface IContextStorageWebStorageHandler<
  T extends Record<string, unknown>,
> extends ContextStorageHandler<T> {
  register: <T extends Record<string, unknown>>(
    data: MaybeRefOrGetter<T>,
    options: RegisterWebStorageHandlerOptions<T>,
  ) => () => void
}

export interface ContextStorageWebStorageRegisteredItem<T extends Record<string, unknown>> {
  data: MaybeRefOrGetter<T>
  initialData: T
  options: RegisterWebStorageHandlerOptions<T>
  watchHandle: WatchHandle
}
