import type { ContextStorageHandlerFactory } from './handlers'
import { createQueryHandler } from './handlers/query'
import { createLocalStorageHandler } from './handlers/local-storage'
import { createSessionStorageHandler } from './handlers/session-storage'

export const defaultHandlers: ContextStorageHandlerFactory[] = [
  createQueryHandler(),
  createLocalStorageHandler(),
  createSessionStorageHandler(),
]
