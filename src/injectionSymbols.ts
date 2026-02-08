import { CollectionManager, type CollectionManagerItem } from './collection'
import { ContextStorageLocalStorageHandler } from './handlers/local-storage'
import { ContextStorageQueryHandler } from './handlers/query'
import { ContextStorageSessionStorageHandler } from './handlers/session-storage'
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

export const contextStorageQueryHandlerInjectKey: InjectionKey<
  InstanceType<typeof ContextStorageQueryHandler>
> = contextStorageQueryHandler

export const contextStorageLocalStorageHandlerInjectKey: InjectionKey<
  InstanceType<typeof ContextStorageLocalStorageHandler>
> = contextStorageLocalStorageHandler

export const contextStorageSessionStorageHandlerInjectKey: InjectionKey<
  InstanceType<typeof ContextStorageSessionStorageHandler>
> = contextStorageSessionStorageHandler

export { contextStoragePrefixSegmentsInjectKey } from './prefix'
