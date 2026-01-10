import type { ContextStorageHandler, ContextStorageHandlerConstructor } from './handlers'

export type CollectionManagerItem = {
  key: string
  handlers: ContextStorageHandler[]
}

interface ItemOptions {
  key: string
}

export class CollectionManager {
  public active?: CollectionManagerItem = undefined
  private collection: CollectionManagerItem[] = []
  private onActiveChangeCallbacks: ((item: CollectionManagerItem) => void)[] = []
  private readonly isReadyPromise: Promise<void>
  private resolveMarkAsReady: (() => void) | undefined = undefined

  constructor(private handlerConstructors: ContextStorageHandlerConstructor[]) {
    this.isReadyPromise = new Promise((resolve) => {
      this.resolveMarkAsReady = resolve
    })
  }

  isReady() {
    return this.isReadyPromise
  }

  markAsReady() {
    this.resolveMarkAsReady?.()
  }

  onActiveChange(callback: (item: CollectionManagerItem) => void): void {
    this.onActiveChangeCallbacks.push(callback)
  }

  first(): CollectionManagerItem | undefined {
    return this.collection[0]
  }

  findItemByKey(key: string): CollectionManagerItem | undefined {
    return this.collection.find((item) => item.key === key)
  }

  add(options: ItemOptions): CollectionManagerItem {
    const handlers = this.handlerConstructors.map((constructor) => new constructor())

    const item: CollectionManagerItem = { handlers, key: options.key }

    this.collection.push(item)

    return item
  }

  remove(removeItem: CollectionManagerItem): void {
    if (this.collection.indexOf(removeItem) === -1) {
      throw new Error('[vue-context-storage] Item not found in collection')
    }

    this.collection = this.collection.filter((item) => item !== removeItem)

    if (this.active === removeItem && this.collection.length > 0) {
      this.setActive(this.collection[this.collection.length - 1])
    }
  }

  setActive(activeItem: CollectionManagerItem): void {
    if (this.active === activeItem) {
      return
    }

    const hasActiveBefore = this.active !== undefined
    this.active = activeItem

    this.collection.forEach((item) => {
      Object.values(item.handlers).forEach((handler) => {
        if (handler.setEnabled) {
          handler.setEnabled(item === activeItem, !hasActiveBefore)
        }
      })
    })

    this.onActiveChangeCallbacks.forEach((callback) => callback(activeItem))
  }
}
