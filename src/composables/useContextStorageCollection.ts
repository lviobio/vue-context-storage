import type { ContextStorageHandlerConstructor } from '../handlers'
import { CollectionManager } from '../collection'
import { provide } from 'vue'
import { contextStorageCollectionInjectKey } from '../injectionSymbols'
import { defaultHandlers } from '../constants'

export function useContextStorageCollection(
  handlers: ContextStorageHandlerConstructor[] = defaultHandlers,
) {
  const collection = new CollectionManager(handlers)

  provide(contextStorageCollectionInjectKey, collection)

  return collection
}
