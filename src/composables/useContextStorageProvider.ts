import { inject, onUnmounted, provide } from 'vue'
import {
  contextStorageCollectionInjectKey,
  contextStorageCollectionItemInjectKey,
  contextStorageHandlersInjectKey,
} from '../injectionSymbols'

export function useContextStorageCollection(key: string) {
  const collection = inject(contextStorageCollectionInjectKey)
  if (!collection) throw new Error('[vue-context-storage] Context storage collection not found')

  const item = collection.add({
    key,
  })

  provide(contextStorageCollectionItemInjectKey, item)
  provide(contextStorageHandlersInjectKey, item.handlers)

  item.handlers.forEach((handler) => {
    provide(handler.getInjectionKey(), handler)
  })

  onUnmounted(() => {
    collection.remove(item)
  })
}
