import { CollectionManager, type CollectionManagerItem } from './collection'
import { ContextStorageQueryHandler } from './handlers/query'
import { collection, collectionItem, contextStorageQueryHandler, handlers } from './symbols'
import type { InjectionKey } from 'vue'

export const contextStorageCollectionInjectKey: InjectionKey<CollectionManager> = collection
export const contextStorageCollectionItemInjectKey: InjectionKey<CollectionManagerItem> =
  collectionItem
export const contextStorageHandlersInjectKey: InjectionKey<CollectionManagerItem['handlers']> =
  handlers

export const contextStorageQueryHandlerInjectKey: InjectionKey<
  InstanceType<typeof ContextStorageQueryHandler>
> = contextStorageQueryHandler
