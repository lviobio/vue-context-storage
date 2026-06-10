// Core exports

export { default as ContextStorageActivator } from './components/ContextStorageActivator.vue'
export { default as ContextStorageCollection } from './components/ContextStorageCollection.vue'
export { default as ContextStorageProvider } from './components/ContextStorageProvider.vue'
export { default as ContextStorage } from './components/ContextStorage.vue'
export { default as ContextStoragePrefix } from './components/ContextStoragePrefix.vue'

export { VueContextStoragePlugin } from './plugin'

export {
  createCollectionManager,
  type CollectionManager,
  type CollectionManagerItem,
} from './collection'

export type {
  ContextStorageHandler,
  ContextStorageHandlerFactory,
  RegisterBaseOptions,
} from './handlers'

export { useContextStorage } from './composables/useContextStorage'
export { useContextStorageActivator } from './composables/useContextStorageActivator'
export { useContextStorageCollection } from './composables/useContextStorageCollection'
export { useContextStorageProvider } from './composables/useContextStorageProvider'

export { createQueryHandler } from './handlers/query'

export { createLocalStorageHandler } from './handlers/local-storage'

export { createSessionStorageHandler } from './handlers/session-storage'

// Handler registry
export { defineContextStorageHandler, resolveHandlerInjectionKey } from './registry'
export type { ContextStorageHandlerMap } from './registry'

// Zod helpers
export { createEmptyZodObject, SCHEMA_SYMBOL, type MaybeWithSchema } from './zod'

// Query transform helpers
export {
  asArray,
  asBoolean,
  asNumber,
  asNumberArray,
  asObjectArray,
  asString,
  transform,
} from './handlers/query/transform-helpers'

export {
  serializeParams as serializeQueryParams,
  deserializeParams as deserializeQueryParams,
  type QueryArrayFormat,
  type QuerySerializeOptions,
  type SerializeOptions,
  type ResolvedSerializeOptions,
} from './handlers/query/helpers'

// Injection symbols
export {
  contextStorageCollectionInjectKey,
  contextStorageCollectionItemInjectKey,
  contextStorageHandlersInjectKey,
  contextStorageLocalStorageHandlerInjectKey,
  contextStorageQueryHandlerInjectKey,
  contextStoragePrefixSegmentsInjectKey,
  contextStorageSessionStorageHandlerInjectKey,
} from './injectionSymbols'

// Constants
export { defaultHandlers } from './constants'

// Types
export type { QueryValue, QuerySerializer, QueryHandlerBaseOptions } from './handlers/query/types'

export type {
  LocalStorageHandlerBaseOptions,
  RegisterLocalStorageHandlerBaseOptions,
} from './handlers/local-storage/types'

export type { ContextStoragePrefixSegment } from './prefix'
