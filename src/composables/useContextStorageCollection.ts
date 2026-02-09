import type { ContextStorageHandlerFactory } from '../handlers'
import { createCollectionManager } from '../collection'
import { provide } from 'vue'
import { contextStorageCollectionInjectKey } from '../injectionSymbols'
import { defaultHandlers } from '../constants'

export function useContextStorageCollection(
  handlers: ContextStorageHandlerFactory[] = defaultHandlers,
) {
  const collection = createCollectionManager(handlers)

  provide(contextStorageCollectionInjectKey, collection)

  return collection
}
