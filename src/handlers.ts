import type { ComputedRef, InjectionKey, MaybeRefOrGetter } from 'vue'
import type { HandlerSchema } from './handlers/types'

export interface ContextStorageHandlerConstructor<
  T extends Record<string, unknown> = {},
  O extends RegisterOptions<T> = RegisterOptions<T>,
> {
  new (): ContextStorageHandler<T, O>
  getInitialStateResolver?: () => () => Record<string, unknown>
}

export interface RegisterBaseOptions<T> {
  causer?: string
  uid?: number

  /**
   * Zod schema for automatic validation and type coercion.
   *
   * When provided, the schema will be used to parse and validate query parameters.
   * This option takes priority over the `transform` option.
   *
   * @example
   * ```ts
   * import { z } from 'zod'
   *
   * const FiltersSchema = z.object({
   *   search: z.string().default(''),
   *   page: z.coerce.number().int().positive().default(1),
   *   status: z.enum(['active', 'inactive']).default('active'),
   * })
   *
   * useContextStorageQueryHandler(filters, {
   *   prefix: 'filters',
   *   schema: FiltersSchema,
   * })
   * ```
   */
  schema?: HandlerSchema<T>
}

export type RegisterOptions<T> = Required<Pick<RegisterBaseOptions<T>, 'causer' | 'uid'>> &
  Omit<RegisterBaseOptions<T>, 'causer' | 'uid'>

export interface RegisterResult {
  stop: () => void
  reset: () => void
  wasChanged: ComputedRef<boolean>
}

export interface ContextStorageHandler<T, O> {
  register: (data: MaybeRefOrGetter<T>, options: O) => RegisterResult
  setInitialState?: (state: Record<string, unknown>) => void
  setEnabled?: (enabled: boolean, initial: boolean) => void
  getInjectionKey(): InjectionKey<ContextStorageHandler<T, O>>
}
