import { ContextStorageCollection, ContextStorageCollectionItem } from './collection'
import { ContextStorageQueryHandler } from './handlers/query'
import { collection, collectionItem, contextStorageQueryHandler, handlers } from './symbols'
import { InjectionKey } from 'vue'

export const contextStorageCollectionInjectKey: InjectionKey<ContextStorageCollection> = collection
export const contextStorageCollectionItemInjectKey: InjectionKey<ContextStorageCollectionItem> =
  collectionItem
export const contextStorageHandlersInjectKey: InjectionKey<
  ContextStorageCollectionItem['handlers']
> = handlers

export const contextStorageQueryHandlerInjectKey: InjectionKey<
  InstanceType<typeof ContextStorageQueryHandler>
> = contextStorageQueryHandler
