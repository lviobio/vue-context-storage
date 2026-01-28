import type { ContextStorageHandlerConstructor } from './handlers'
import { ContextStorageQueryHandler } from './handlers/query'
import { ContextStorageLocalStorageHandler } from './handlers/local-storage'
import { ContextStorageSessionStorageHandler } from './handlers/session-storage'

export const defaultHandlers: ContextStorageHandlerConstructor[] = [
  ContextStorageQueryHandler,
  ContextStorageLocalStorageHandler,
  ContextStorageSessionStorageHandler,
]
