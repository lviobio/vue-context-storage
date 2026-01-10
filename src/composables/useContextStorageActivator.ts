import { inject } from 'vue'
import {
  contextStorageCollectionInjectKey,
  contextStorageCollectionItemInjectKey,
} from '../injectionSymbols'

export function useContextStorageActivator() {
  const collection = inject(contextStorageCollectionInjectKey)!
  const item = inject(contextStorageCollectionItemInjectKey)!

  return {
    activate: () => collection.setActive(item),
  }
}
