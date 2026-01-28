import type { InjectionKey } from 'vue'
import type { ContextStorageHandler } from './handlers'
import type { RegisterQueryHandlerBaseOptions } from './handlers/query/types'
import type { UseWebStorageOptions } from './handlers/web-storage-base'
import {
  contextStorageLocalStorageHandlerInjectKey,
  contextStorageQueryHandlerInjectKey,
  contextStorageSessionStorageHandlerInjectKey,
} from './injectionSymbols'

/**
 * Augmentable interface mapping handler names to their options types.
 *
 * Users can extend this via module declaration:
 * ```typescript
 * declare module 'vue-context-storage' {
 *   interface ContextStorageHandlerMap {
 *     myHandler: MyHandlerOptions
 *   }
 * }
 * ```
 */
export interface ContextStorageHandlerMap {
  query: RegisterQueryHandlerBaseOptions<any>
  localStorage: UseWebStorageOptions<any>
  sessionStorage: UseWebStorageOptions<any>
}

// Runtime map: string → injection key
const handlerRegistry = new Map<string, InjectionKey<ContextStorageHandler>>()

export function defineContextStorageHandler(
  name: string,
  injectionKey: InjectionKey<ContextStorageHandler>,
): void {
  handlerRegistry.set(name, injectionKey)
}

export function resolveHandlerInjectionKey(
  type: string,
): InjectionKey<ContextStorageHandler> | undefined {
  return handlerRegistry.get(type)
}

// Pre-register built-in handlers
defineContextStorageHandler('query', contextStorageQueryHandlerInjectKey)
defineContextStorageHandler('localStorage', contextStorageLocalStorageHandlerInjectKey)
defineContextStorageHandler('sessionStorage', contextStorageSessionStorageHandlerInjectKey)
