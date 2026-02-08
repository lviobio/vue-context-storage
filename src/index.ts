// Core exports

export { default as ContextStorageActivator } from './components/ContextStorageActivator.vue'
export { default as ContextStorageCollection } from './components/ContextStorageCollection.vue'
export { default as ContextStorageProvider } from './components/ContextStorageProvider.vue'
export { default as ContextStorage } from './components/ContextStorage.vue'

export { VueContextStoragePlugin } from './plugin'

export { CollectionManager, type CollectionManagerItem } from './collection'

export type {
  ContextStorageHandler,
  ContextStorageHandlerConstructor,
  RegisterBaseOptions,
} from './handlers'

export { useContextStorage } from './composables/useContextStorage'
export { useContextStorageActivator } from './composables/useContextStorageActivator'
export { useContextStorageCollection } from './composables/useContextStorageCollection'
export { useContextStorageProvider } from './composables/useContextStorageProvider'

export { ContextStorageQueryHandler, useContextStorageQueryHandler } from './handlers/query'

export {
  ContextStorageLocalStorageHandler,
  useContextStorageLocalStorage,
} from './handlers/local-storage'

export {
  ContextStorageSessionStorageHandler,
  useContextStorageSessionStorage,
} from './handlers/session-storage'

// Handler registry
export { defineContextStorageHandler, resolveHandlerInjectionKey } from './registry'
export type { ContextStorageHandlerMap } from './registry'

// Query transform helpers
export {
  asArray,
  asBoolean,
  asNumber,
  asNumberArray,
  asString,
  transform,
} from './handlers/query/transform-helpers'

export {
  serializeParams as serializeQueryParams,
  deserializeParams as deserializeQueryParams,
} from './handlers/query/helpers'

// Injection symbols
export {
  contextStorageCollectionInjectKey,
  contextStorageCollectionItemInjectKey,
  contextStorageHandlersInjectKey,
  contextStorageLocalStorageHandlerInjectKey,
  contextStorageQueryHandlerInjectKey,
  contextStorageSessionStorageHandlerInjectKey,
} from './injectionSymbols'

// Constants
export { defaultHandlers } from './constants'

// Types
export type { QueryValue } from './handlers/query/types'

export type {
  LocalStorageHandlerBaseOptions,
  RegisterLocalStorageHandlerBaseOptions,
} from './handlers/local-storage/types'
