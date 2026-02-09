import type { CollectionManager, CollectionManagerItem } from './collection'
import type { ContextStorageHandler } from './handlers'
import {
  collection,
  collectionItem,
  contextStorageLocalStorageHandler,
  contextStorageQueryHandler,
  contextStorageSessionStorageHandler,
  handlers,
} from './symbols'
import type { InjectionKey } from 'vue'

export const contextStorageCollectionInjectKey: InjectionKey<CollectionManager> = collection
export const contextStorageCollectionItemInjectKey: InjectionKey<CollectionManagerItem> =
  collectionItem
export const contextStorageHandlersInjectKey: InjectionKey<CollectionManagerItem['handlers']> =
  handlers

export const contextStorageQueryHandlerInjectKey: InjectionKey<ContextStorageHandler<any, any>> =
  contextStorageQueryHandler

export const contextStorageLocalStorageHandlerInjectKey: InjectionKey<
  ContextStorageHandler<any, any>
> = contextStorageLocalStorageHandler

export const contextStorageSessionStorageHandlerInjectKey: InjectionKey<
  ContextStorageHandler<any, any>
> = contextStorageSessionStorageHandler

export { contextStoragePrefixSegmentsInjectKey } from './prefix'
