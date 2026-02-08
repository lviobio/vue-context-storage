export const collection: unique symbol = Symbol('context-storage-collection')
export const collectionItem: unique symbol = Symbol('context-storage-collection-item')
export const handlers: unique symbol = Symbol('context-storage-handlers')
export const contextStorageQueryHandler: unique symbol = Symbol('context-storage-query-handler')
export const contextStorageLocalStorageHandler: unique symbol = Symbol(
  'context-storage-local-storage-handler',
)
export const contextStorageSessionStorageHandler: unique symbol = Symbol(
  'context-storage-session-storage-handler',
)
export const contextStoragePrefixSegments: unique symbol = Symbol('context-storage-prefix-segments')
