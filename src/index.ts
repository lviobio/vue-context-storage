// Core exports
import { ContextStorageQueryHandler } from './handlers/query'
import type { ContextStorageHandlerConstructor } from './handlers'

export { ContextStorageCollection } from './collection'
export type { ContextStorageCollectionItem } from './collection'

export type {
  ContextStorageHandler,
  ContextStorageHandlerConstructor,
  RegisterBaseOptions,
} from './handlers'

export { ContextStorageQueryHandler, useContextStorageQueryHandler } from './handlers/query'

// Query helpers
export { deserializeParams, serializeParams } from './handlers/query/helpers.ts'
export type { SerializeOptions } from './handlers/query/helpers.ts'

// Query transform helpers
export {
  asArray,
  asBoolean,
  asNumber,
  asNumberArray,
  asString,
  transform,
} from './handlers/query/transform-helpers.ts'

// Injection symbols
export {
  contextStorageCollectionInjectKey,
  contextStorageCollectionItemInjectKey,
  contextStorageHandlersInjectKey,
  contextStorageQueryHandlerInjectKey,
} from './injectionSymbols'

// Symbols
export { collection, collectionItem, contextStorageQueryHandler, handlers } from './symbols'

export const defaultHandlers: ContextStorageHandlerConstructor[] = [ContextStorageQueryHandler]
export type { QueryValue, IContextStorageQueryHandler } from './handlers/query/types'
