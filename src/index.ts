// Core exports

export { default as ContextStorageActivator } from './components/ContextStorageActivator.vue'
export { default as ContextStorageCollection } from './components/ContextStorageCollection.vue'
export { default as ContextStorageProvider } from './components/ContextStorageProvider.vue'
export { default as ContextStorage } from './components/ContextStorage.vue'

export type {
  ContextStorageHandler,
  ContextStorageHandlerConstructor,
  RegisterBaseOptions,
} from './handlers'

export { ContextStorageQueryHandler, useContextStorageQueryHandler } from './handlers/query'

// Query helpers
export { deserializeParams, serializeParams } from './handlers/query/helpers'
export type { SerializeOptions } from './handlers/query/helpers'

// Query transform helpers
export {
  asArray,
  asBoolean,
  asNumber,
  asNumberArray,
  asString,
  transform,
} from './handlers/query/transform-helpers'

// Injection symbols
export {
  contextStorageCollectionInjectKey,
  contextStorageCollectionItemInjectKey,
  contextStorageHandlersInjectKey,
  contextStorageQueryHandlerInjectKey,
} from './injectionSymbols'

// Symbols
export { collection, collectionItem, contextStorageQueryHandler, handlers } from './symbols'

// Constants
export { defaultHandlers } from './constants'

// Types
export type { QueryValue, IContextStorageQueryHandler } from './handlers/query/types'
