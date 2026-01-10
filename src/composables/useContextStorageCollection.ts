import type { ContextStorageHandlerConstructor } from '../handlers'
import { CollectionManager } from '../collection'
import { provide } from 'vue'
import { contextStorageCollectionInjectKey } from '../injectionSymbols'

export function useContextStorageCollection(handlers: ContextStorageHandlerConstructor[]) {
  const collection = new CollectionManager(handlers)

  provide(contextStorageCollectionInjectKey, collection)

  return collection
}
