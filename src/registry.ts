import type { InjectionKey } from 'vue'
import type { ContextStorageHandler } from './handlers'
import type { RegisterQueryHandlerOptions } from './handlers/query/types'
import {
  contextStorageLocalStorageHandlerInjectKey,
  contextStorageQueryHandlerInjectKey,
  contextStorageSessionStorageHandlerInjectKey,
} from './injectionSymbols'
import type { RegisterWebStorageHandlerOptions } from './handlers/web-storage-base/types'

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
): void {
  handlerRegistry.set(name, injectionKey)
}

export function resolveHandlerInjectionKey<K extends keyof ContextStorageHandlerMap<T>, T>(
  type: K,
): InjectionKey<ContextStorageHandler<T, ContextStorageHandlerMap<T>[K]>> | undefined {
  return handlerRegistry.get(type)
}

// Pre-register built-in handlers
defineContextStorageHandler('query', contextStorageQueryHandlerInjectKey)
defineContextStorageHandler('localStorage', contextStorageLocalStorageHandlerInjectKey)
defineContextStorageHandler('sessionStorage', contextStorageSessionStorageHandlerInjectKey)
