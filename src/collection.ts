import type {
  ContextStorageHandler,
  ContextStorageHandlerFactory,
  RegisterOptions,
} from './handlers'

export type CollectionManagerItem = {
  key: string
  handlers: ContextStorageHandler<any, RegisterOptions<any>>[]
}

export interface ItemOptions {
  key: string
}

/**
 * Deduplicates handlers by injection key, keeping the last handler for each key.
 * This allows `additionalHandlers` to override default handlers of the same type.
 */
function deduplicateHandlers(
  handlers: ContextStorageHandler<any, RegisterOptions<any>>[],
): ContextStorageHandler<any, RegisterOptions<any>>[] {
  const map = new Map<unknown, ContextStorageHandler<any, RegisterOptions<any>>>()
  for (const handler of handlers) {
    map.set(handler.getInjectionKey(), handler)
  }
  return Array.from(map.values())
}

export function createItem(
  handlerFactories: ContextStorageHandlerFactory[],
  options: ItemOptions,
): CollectionManagerItem {
  const handlers = deduplicateHandlers(handlerFactories.map((factory) => factory()))

  return { handlers, key: options.key }
}

export function createCollectionManager(handlerFactories: ContextStorageHandlerFactory[]) {
  let active: CollectionManagerItem | undefined = undefined
  const collection: CollectionManagerItem[] = []
  const onActiveChangeCallbacks: ((item: CollectionManagerItem) => void)[] = []
  let resolveMarkAsReady: (() => void) | undefined = undefined
  const isReadyPromise = new Promise<void>((resolve) => {
    resolveMarkAsReady = resolve
  })

  function isReady() {
    return isReadyPromise
  }

  function markAsReady() {
    resolveMarkAsReady?.()
  }

  function onActiveChange(callback: (item: CollectionManagerItem) => void): () => void {
    onActiveChangeCallbacks.push(callback)
    return () => {
      const index = onActiveChangeCallbacks.indexOf(callback)
      if (index !== -1) {
        onActiveChangeCallbacks.splice(index, 1)
      }
    }
  }

  function first(): CollectionManagerItem | undefined {
    return collection[0]
  }

  function findItemByKey(key: string): CollectionManagerItem | undefined {
    return collection.find((item) => item.key === key)
  }

  function add(options: ItemOptions): CollectionManagerItem {
    const item = createItem(handlerFactories, options)

    collection.push(item)

    return item
  }

  function remove(removeItem: CollectionManagerItem): void {
    if (collection.indexOf(removeItem) === -1) {
      throw new Error('[vue-context-storage] Item not found in collection')
    }

    const idx = collection.indexOf(removeItem)
    collection.splice(idx, 1)

    if (active === removeItem && collection.length > 0) {
      setActive(collection[collection.length - 1])
    }
  }

  function setActive(activeItem: CollectionManagerItem): void {
    if (active === activeItem) {
      return
    }

    const hasActiveBefore = active !== undefined
    active = activeItem

    collection.forEach((item) => {
      Object.values(item.handlers).forEach((handler) => {
        if (handler.setEnabled) {
          handler.setEnabled(item === activeItem, !hasActiveBefore)
        }
      })
    })

    onActiveChangeCallbacks.forEach((callback) => callback(activeItem))
  }

  return {
    get active() {
      return active
    },
    isReady,
    markAsReady,
    onActiveChange,
    first,
    findItemByKey,
    add,
    remove,
    setActive,
  }
}

export type CollectionManager = ReturnType<typeof createCollectionManager>
