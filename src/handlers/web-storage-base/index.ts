import { cloneDeep, isEqual, merge, pick } from 'lodash'
import {
  getCurrentInstance,
  inject,
  type InjectionKey,
  type MaybeRefOrGetter,
  onBeforeUnmount,
  toValue,
  watch,
} from 'vue'
import type {
  ContextStorageWebStorageRegisteredItem,
  IContextStorageWebStorageHandler,
  RegisterWebStorageHandlerBaseOptions,
  RegisterWebStorageHandlerOptions,
  WebStorageHandlerBaseOptions,
} from './types'

export abstract class ContextStorageWebStorageHandler<
  T extends Record<string, unknown>,
> implements IContextStorageWebStorageHandler<T> {
  protected enabled = false
  protected registered: ContextStorageWebStorageRegisteredItem<any>[] = []
  protected initialState?: Record<string, unknown>
  protected hasAnyRegistered = false
  protected preventSyncToStorage = false

  protected abstract readonly storage: Storage
  protected abstract readonly injectionKey: InjectionKey<ContextStorageWebStorageHandler<T>>

  protected readonly options: Required<WebStorageHandlerBaseOptions>

  private storageEventHandler: ((event: StorageEvent) => void) | null = null

  protected constructor(defaultOptions: Required<WebStorageHandlerBaseOptions>) {
    this.options = { ...defaultOptions }
  }

  protected initializeStorageListener(): void {
    if (this.options.listenToStorageEvents && typeof window !== 'undefined') {
      this.storageEventHandler = (event: StorageEvent): void => {
        this.handleStorageEvent(event)
      }
      window.addEventListener('storage', this.storageEventHandler)

      onBeforeUnmount(() => {
        if (this.storageEventHandler) {
          window.removeEventListener('storage', this.storageEventHandler)
          this.storageEventHandler = null
        }
      })
    }
  }

  protected handleStorageEvent(event: StorageEvent): void {
    if (!this.enabled) {
      return
    }

    // Find registered items that match the changed key
    this.registered.forEach((item) => {
      if (event.key === item.options.key) {
        this.syncStorageToRegisteredItem(item)
      }
    })
  }

  getInjectionKey(): InjectionKey<ContextStorageWebStorageHandler<T>> {
    return this.injectionKey
  }

  setInitialState(state: Record<string, unknown> | undefined): void {
    this.initialState = state
  }

  setEnabled(state: boolean, initial: boolean): void {
    const prevState = this.enabled
    this.enabled = state

    if (this.hasAnyRegistered) {
      if (initial) {
        this.syncStorageToRegistered()
      }

      if ((state && !prevState) || !initial) {
        this.syncRegisteredToStorage()
      }
    }
  }

  syncRegisteredToStorage(): void {
    if (!this.enabled) {
      return
    }

    if (this.preventSyncToStorage) {
      return
    }

    // Group registered items by storage key
    const byKey = new Map<string, ContextStorageWebStorageRegisteredItem<any>[]>()

    this.registered.forEach((item) => {
      const key = item.options.key!
      if (!byKey.has(key)) {
        byKey.set(key, [])
      }
      byKey.get(key)!.push(item)
    })

    // Write each key's data to storage
    byKey.forEach((items, key) => {
      let storageData: Record<string, unknown> = {}

      // Try to read existing data first to preserve other prefixes
      try {
        const existing = this.storage.getItem(key)
        if (existing) {
          storageData = JSON.parse(existing)
        }
      } catch {
        // Ignore parse errors, start fresh
      }

      items.forEach((item) => {
        const { prefix, serializer } = item.options
        const data = toValue(item.data)

        if (prefix) {
          storageData[prefix] = data
        } else {
          storageData = { ...storageData, ...data }
        }

        // Use custom serializer if provided, otherwise merge into main object
        if (serializer && !prefix) {
          // Custom serializer with no prefix - serialize the whole data
          try {
            this.storage.setItem(key, serializer(data))
          } catch (e) {
            console.error('[vue-context-storage] Error writing to storage', e)
          }
          return
        }
      })

      // Write merged data
      try {
        this.storage.setItem(key, JSON.stringify(storageData))
      } catch (e) {
        console.error('[vue-context-storage] Error writing to storage', e)
      }
    })
  }

  syncStorageToRegisteredItem<T extends Record<string, unknown>>(
    item: ContextStorageWebStorageRegisteredItem<T>,
  ): void {
    const { key, prefix, deserializer } = item.options

    let stored: string | null = null
    try {
      stored = this.storage.getItem(key!)
    } catch {
      return
    }

    if (stored === null) {
      return
    }

    let deserialized: Record<string, unknown>
    try {
      if (deserializer) {
        deserialized = deserializer(stored) as Record<string, unknown>
      } else {
        deserialized = JSON.parse(stored)
      }
    } catch {
      console.warn('[vue-context-storage] Failed to parse storage data for key:', key)
      return
    }

    if (typeof prefix === 'string' && prefix.length > 0) {
      deserialized = (deserialized[prefix] as Record<string, unknown>) || {}
    }

    if (deserialized === undefined || deserialized === null) {
      return
    }

    const itemData = toValue(item.data)

    // Priority: schema > transform > default merge
    if (item.options?.schema) {
      const result = item.options.schema.safeParse(deserialized)

      if (result.success) {
        deserialized = result.data as Record<string, unknown>
      } else {
        console.warn('[vue-context-storage] schema parse failed', result.error)
        // Fall back to initial data on schema failure
        merge(itemData, item.initialData)
        return
      }

      if (item.options?.transform) {
        console.warn('[vue-context-storage] transform is not supported with schema')
      }
    } else if (item.options?.transform) {
      deserialized = item.options.transform(deserialized, item.initialData) as Record<
        string,
        unknown
      >
    } else {
      // Without transform, only merge existing keys
      deserialized = pick(deserialized, Object.keys(item.initialData))
    }

    if (isEqual(itemData, deserialized)) {
      return
    }

    merge(itemData, deserialized)
  }

  syncStorageToRegistered(): void {
    this.registered.forEach((item) => this.syncStorageToRegisteredItem(item))
  }

  register<T extends Record<string, unknown>>(
    data: MaybeRefOrGetter<T>,
    options: RegisterWebStorageHandlerOptions<T>,
  ) {
    if (!options.key) {
      throw new Error('[vue-context-storage] Storage handler requires a key option')
    }

    this.hasAnyRegistered = true

    const watchHandle = watch(data, () => this.syncRegisteredToStorage(), {
      deep: true,
    })

    const item: ContextStorageWebStorageRegisteredItem<T> = {
      data,
      initialData: cloneDeep(toValue(data)) as T,
      options,
      watchHandle,
    }
    this.registered.push(item)

    this.syncStorageToRegisteredItem(item)

    return {
      stop: () => {
        watchHandle.stop()
        this.registered.splice(this.registered.indexOf(item), 1)
      },
    }
  }
}

/**
 * Options for the web storage composable with required key
 */
export type UseWebStorageOptions<T> = RegisterWebStorageHandlerBaseOptions<T> &
  Required<Pick<RegisterWebStorageHandlerBaseOptions<T>, 'key'>>

export function createWebStorageComposable<Handler extends ContextStorageWebStorageHandler<any>>(
  injectionKey: InjectionKey<Handler>,
  handlerName: string,
) {
  return function useContextStorageWebStorage<T extends Record<string, unknown>>(
    data: MaybeRefOrGetter<T>,
    options: UseWebStorageOptions<T>,
  ): void {
    const handler = inject<Handler>(injectionKey)

    if (!handler) {
      throw new Error(`[vue-context-storage] ${handlerName} is not provided`)
    }

    const currentInstance = getCurrentInstance()
    const uid = currentInstance?.uid || 0

    const causer = new Error().stack?.split('\n')[2]?.trimStart() || 'unknown'

    const { stop } = handler.register(data, { causer, uid, ...options })
    onBeforeUnmount(() => {
      stop()
    })
  }
}
