import type { InjectionKey } from 'vue'
import type { ContextStorageHandler } from './handlers'
import type { RegisterQueryHandlerOptions } from './handlers/query/types'
import {
  contextStorageLocalStorageHandlerInjectKey,
  contextStorageQueryHandlerInjectKey,
  contextStorageSessionStorageHandlerInjectKey,
} from './injectionSymbols'
import type { RegisterWebStorageHandlerOptions } from './handlers/web-storage-base/types'
import { registerKnownHandlerKey } from './handlers/helpers'

/**
 * Augmentable interface mapping handler names to their options types.
 *
 * Users can extend this via module declaration:
 * ```ts
 * declare module 'vue-context-storage' {
 *   interface ContextStorageHandlerMap {
 *     myHandler: MyHandlerOptions
 *   }
 * }
 * ```
 */
export interface ContextStorageHandlerMap<T> {
  query: RegisterQueryHandlerOptions<T>
  localStorage: RegisterWebStorageHandlerOptions<T>
  sessionStorage: RegisterWebStorageHandlerOptions<T>
}

// Runtime map: string → injection key
const handlerRegistry = new Map<string, InjectionKey<ContextStorageHandler<any, object>>>()

export function defineContextStorageHandler<T, O extends object>(
  name: string,
  injectionKey: InjectionKey<ContextStorageHandler<T, O>>,
  options?: { prefixProperty?: string; prefixMergeStrategy?: 'prepend' | 'append' },
): void {
  handlerRegistry.set(name, injectionKey)
  registerKnownHandlerKey(injectionKey, name, options?.prefixProperty, options?.prefixMergeStrategy)
}

export function resolveHandlerInjectionKey<K extends keyof ContextStorageHandlerMap<T>, T>(
  type: K,
): InjectionKey<ContextStorageHandler<T, ContextStorageHandlerMap<T>[K]>> | undefined {
  return handlerRegistry.get(type)
}

// Pre-register built-in handlers
defineContextStorageHandler('query', contextStorageQueryHandlerInjectKey, { prefixProperty: 'key' })
defineContextStorageHandler('localStorage', contextStorageLocalStorageHandlerInjectKey, {
  prefixProperty: 'key',
  prefixMergeStrategy: 'append',
})
defineContextStorageHandler('sessionStorage', contextStorageSessionStorageHandlerInjectKey, {
  prefixProperty: 'key',
  prefixMergeStrategy: 'append',
})
