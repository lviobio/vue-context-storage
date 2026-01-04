import { ContextStorageHandler, ContextStorageHandlerConstructor } from './handlers'

export type ContextStorageCollectionItem = {
  key: string
  handlers: ContextStorageHandler[]
}

interface ItemOptions {
  key: string
}

export class ContextStorageCollection {
  public active?: ContextStorageCollectionItem = undefined
  private collection: ContextStorageCollectionItem[] = []
  private onActiveChangeCallbacks: ((item: ContextStorageCollectionItem) => void)[] = []

  constructor(private handlerConstructors: ContextStorageHandlerConstructor[]) {}

  onActiveChange(callback: (item: ContextStorageCollectionItem) => void): void {
    this.onActiveChangeCallbacks.push(callback)
  }

  first(): ContextStorageCollectionItem | undefined {
    return this.collection[0]
  }

  findItemByKey(key: string): ContextStorageCollectionItem | undefined {
    return this.collection.find((item) => item.key === key)
  }

  add(options: ItemOptions): ContextStorageCollectionItem {
    const handlers = this.handlerConstructors.map((constructor) => new constructor())

    const item: ContextStorageCollectionItem = { handlers, key: options.key }

    this.collection.push(item)

    return item
  }

  remove(removeItem: ContextStorageCollectionItem): void {
    if (this.collection.indexOf(removeItem) === -1) {
      throw new Error('[ContextStorage] Item not found in collection')
    }

    this.collection = this.collection.filter((item) => item !== removeItem)

    if (this.active === removeItem && this.collection.length > 0) {
      this.setActive(this.collection[this.collection.length - 1])
    }
  }

  setActive(activeItem: ContextStorageCollectionItem): void {
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
