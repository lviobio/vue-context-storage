import { cloneDeep, isEqual, pick } from 'lodash'
import { syncReactive } from '../helpers'
import {
  computed,
  inject,
  type InjectionKey,
  type MaybeRefOrGetter,
  onBeforeUnmount,
  toValue,
  watch,
} from 'vue'
import type {
  ContextStorageWebStorageRegisteredItem,
  RegisterWebStorageHandlerOptions,
  WebStorageHandlerBaseOptions,
} from './types'
import { buildContextStorageHandler } from '../helpers'
import type { ContextStorageHandler } from '../../handlers'
import type { UseContextStorageResult } from '../../composables/types'

export abstract class ContextStorageWebStorageHandler<
  T extends Record<string, unknown>,
> implements ContextStorageHandler<T, RegisterWebStorageHandlerOptions<T>> {
  protected enabled = false
  protected registered: ContextStorageWebStorageRegisteredItem<any>[] = []
  private registeredDataObjects = new Set<object>()
  protected initialState?: Record<string, unknown>
  protected hasAnyRegistered = false
  protected preventSyncToStorage = false

  protected abstract readonly storage: Storage
  protected abstract readonly injectionKey: InjectionKey<ContextStorageWebStorageHandler<T>>
  protected abstract readonly handlerName: string

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

  /**
   * Computes the effective storage key by appending the prefix in bracket notation.
   *
   * e.g. key='form', prefix='filters'    → 'form[filters]'
   * e.g. key='form', prefix='a[b][d]'    → 'form[a][b][d]'
   */
  private resolveStorageKey(key: string, prefix?: string): string {
    if (prefix) {
      // prefix may already contain brackets (e.g. 'a[b][d]'),
      // wrap only the first segment to avoid double-nesting
      const bracketIdx = prefix.indexOf('[')
      if (bracketIdx === -1) {
        return `${key}[${prefix}]`
      }
      return `${key}[${prefix.slice(0, bracketIdx)}]${prefix.slice(bracketIdx)}`
    }
    return key
  }

  protected handleStorageEvent(event: StorageEvent): void {
    if (!this.enabled) {
      return
    }

    // Find registered items that match the changed key
    this.registered.forEach((item) => {
      const effectiveKey = this.resolveStorageKey(item.options.key!, item.options.prefix)
      if (event.key === effectiveKey) {
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

    this.registered.forEach((item) => {
      const effectiveKey = this.resolveStorageKey(item.options.key!, item.options.prefix)
      const data = toValue(item.data)
      const { serializer } = item.options

      try {
        if (serializer) {
          this.storage.setItem(effectiveKey, serializer(data))
        } else {
          this.storage.setItem(effectiveKey, JSON.stringify(data))
        }
      } catch (e) {
        console.error('[vue-context-storage] Error writing to storage', e)
      }
    })
  }

  syncStorageToRegisteredItem<T extends Record<string, unknown>>(
    item: ContextStorageWebStorageRegisteredItem<T>,
  ): void {
    const { key, prefix, deserializer } = item.options
    const effectiveKey = this.resolveStorageKey(key!, prefix)

    let stored: string | null = null
    try {
      stored = this.storage.getItem(effectiveKey)
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
      console.warn('[vue-context-storage] Failed to parse storage data for key:', effectiveKey)
      return
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
        syncReactive(itemData, item.initialData)
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

    syncReactive(itemData, deserialized)
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

    const resolvedData = toValue(data)
    if (this.registeredDataObjects.has(resolvedData)) {
      console.warn(
        `[vue-context-storage] The same data object is already registered in ${this.handlerName}.`,
        { key: options.key, prefix: options.prefix },
      )
    }
    this.registeredDataObjects.add(resolvedData)

    this.hasAnyRegistered = true

    const watchHandle = watch(data, () => this.syncRegisteredToStorage(), {
      deep: true,
    })

    const item: ContextStorageWebStorageRegisteredItem<T> = {
      data,
      initialData: cloneDeep(resolvedData) as T,
      options,
      watchHandle,
    }
    this.registered.push(item)

    this.syncStorageToRegisteredItem(item)
    this.syncRegisteredToStorage()

    const wasChanged = computed(() => !isEqual(toValue(data), item.initialData))

    return {
      stop: () => {
        watchHandle.stop()
        const index = this.registered.indexOf(item)
        if (index !== -1) {
          this.registered.splice(index, 1)
        }
        this.registeredDataObjects.delete(resolvedData)
      },
      reset: () => {
        syncReactive(toValue(data) as Record<string, unknown>, cloneDeep(item.initialData))
      },
      wasChanged,
    }
  }
}

// /**
//  * Options for the web storage composable with required key
//  */
// export type UseWebStorageOptions<T> = RegisterWebStorageHandlerBaseOptions<T> &
//   Required<Pick<RegisterWebStorageHandlerBaseOptions<T>, 'key'>>

export function createWebStorageComposable<
  Handler extends ContextStorageWebStorageHandler<T>,
  T extends Record<string, unknown>,
>(injectionKey: InjectionKey<Handler>, handlerName: string) {
  return function useContextStorageWebStorage(
    data: MaybeRefOrGetter<T>,
    options: RegisterWebStorageHandlerOptions<T>,
  ): UseContextStorageResult<T> {
    const handler = inject<Handler>(injectionKey)

    if (!handler) {
      throw new Error(`[vue-context-storage] ${handlerName} is not provided`)
    }

    return buildContextStorageHandler(handler, data, options)
  }
}
