import type { ContextStorageHandlerConstructor } from './handlers'
import { ContextStorageQueryHandler } from './handlers/query'

export const defaultHandlers: ContextStorageHandlerConstructor[] = [ContextStorageQueryHandler]
