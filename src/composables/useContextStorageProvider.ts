import { inject, onUnmounted, provide } from 'vue'
import {
  contextStorageCollectionInjectKey,
  contextStorageCollectionItemInjectKey,
  contextStorageHandlersInjectKey,
} from '../injectionSymbols'
import type { CollectionManagerItem } from '../collection'

export function useContextStorageProvider(key: string) {
  const collection = inject(contextStorageCollectionInjectKey)
  if (!collection) throw new Error('[vue-context-storage] Context storage collection not found')

  const item = collection.add({
    key,
  })

  onUnmounted(() => {
    collection.remove(item)
  })
}

export function useContextStorageItemProvider(item: CollectionManagerItem) {
  provide(contextStorageCollectionItemInjectKey, item)
  provide(contextStorageHandlersInjectKey, item.handlers)

  item.handlers.forEach((handler) => {
    provide(handler.getInjectionKey(), handler)
  })
}
