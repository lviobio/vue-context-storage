import { cloneDeep, isEqual } from 'lodash'
import { applyTransform, buildContextStorageHandler, syncReactive } from '../helpers'
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
import type { ContextStorageHandler } from '../../handlers'
import type { UseContextStorageResult } from '../../composables/types'

interface WebStorageHandlerConfig {
  storage: Storage
  injectionKey: InjectionKey<any>
  handlerName: string
  options: Required<WebStorageHandlerBaseOptions>
}

export function createWebStorageHandlerInstance<T extends Record<string, unknown>>(
  config: WebStorageHandlerConfig,
): ContextStorageHandler<T, RegisterWebStorageHandlerOptions<T>> {
  let enabled = false
  const registered: ContextStorageWebStorageRegisteredItem<any>[] = []
  const registeredDataObjects = new Set<object>()
  let hasAnyRegistered = false
  const preventSyncToStorage = false

  // Storage listener
  if (config.options.listenToStorageEvents && typeof window !== 'undefined') {
    const handler = (event: StorageEvent): void => {
      handleStorageEvent(event)
    }
    window.addEventListener('storage', handler)

    onBeforeUnmount(() => {
      window.removeEventListener('storage', handler)
    })
  }

  /**
   * Computes the effective storage key by appending the prefix in bracket notation.
   *
   * e.g. key='form', prefix='filters'    → 'form[filters]'
   * e.g. key='form', prefix='a[b][d]'    → 'form[a][b][d]'
   */
  function resolveStorageKey(key: string, prefix?: string): string {
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

  function handleStorageEvent(event: StorageEvent): void {
    if (!enabled) {
      return
    }

    // Find registered items that match the changed key
    registered.forEach((item) => {
      const effectiveKey = resolveStorageKey(item.options.key!, item.options.prefix)
      if (event.key === effectiveKey) {
        syncStorageToRegisteredItem(item)
      }
    })
  }

  function getInjectionKey(): InjectionKey<
    ContextStorageHandler<T, RegisterWebStorageHandlerOptions<T>>
  > {
    return config.injectionKey
  }

  function setEnabled(state: boolean, initial: boolean): void {
    const prevState = enabled
    enabled = state

    if (hasAnyRegistered) {
      if (initial) {
        syncStorageToRegistered()
      }

      if ((state && !prevState) || !initial) {
        syncRegisteredToStorage()
      }
    }
  }

  function syncRegisteredToStorage(): void {
    if (!enabled) {
      return
    }

    if (preventSyncToStorage) {
      return
    }

    registered.forEach((item) => {
      const effectiveKey = resolveStorageKey(item.options.key!, item.options.prefix)
      const data = toValue(item.data)
      const { serializer } = item.options

      try {
        if (serializer) {
          config.storage.setItem(effectiveKey, serializer(data))
        } else {
          config.storage.setItem(effectiveKey, JSON.stringify(data))
        }
      } catch (e) {
        console.error('[vue-context-storage] Error writing to storage', e)
      }
    })
  }

  function syncStorageToRegisteredItem<T extends Record<string, unknown>>(
    item: ContextStorageWebStorageRegisteredItem<T>,
  ): void {
    const { key, prefix, deserializer } = item.options
    const effectiveKey = resolveStorageKey(key!, prefix)

    let stored: string | null = null
    try {
      stored = config.storage.getItem(effectiveKey)
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

    const transformed = applyTransform({
      state: deserialized,
      initialData: item.initialData,
      schema: item.options?.schema,
      transform: item.options?.transform,
      mergeOnlyExistingKeysWithoutTransform: true,
    })

    transformed.warnings.forEach((w) => console.warn(w.message, ...w.args))

    if (isEqual(itemData, transformed.data)) {
      return
    }

    syncReactive(itemData, transformed.data)
  }

  function syncStorageToRegistered(): void {
    registered.forEach((item) => syncStorageToRegisteredItem(item))
  }

  function register<T extends Record<string, unknown>>(
    data: MaybeRefOrGetter<T>,
    options: RegisterWebStorageHandlerOptions<T>,
  ) {
    if (!options.key) {
      throw new Error('[vue-context-storage] Storage handler requires a key option')
    }

    const resolvedData = toValue(data)
    if (registeredDataObjects.has(resolvedData)) {
      console.warn(
        `[vue-context-storage] The same data object is already registered in ${config.handlerName}.`,
        { key: options.key, prefix: options.prefix },
      )
    }
    registeredDataObjects.add(resolvedData)

    hasAnyRegistered = true

    const watchHandle = watch(data, () => syncRegisteredToStorage(), {
      deep: true,
    })

    const item: ContextStorageWebStorageRegisteredItem<T> = {
      data,
      initialData: cloneDeep(resolvedData) as T,
      options,
      watchHandle,
    }
    registered.push(item)

    syncStorageToRegisteredItem(item)
    syncRegisteredToStorage()

    const wasChanged = computed(() => !isEqual(toValue(data), item.initialData))

    return {
      stop: () => {
        watchHandle.stop()
        const index = registered.indexOf(item)
        if (index !== -1) {
          registered.splice(index, 1)
        }
        registeredDataObjects.delete(resolvedData)
      },
      reset: () => {
        syncReactive(toValue(data) as Record<string, unknown>, cloneDeep(item.initialData))
      },
      wasChanged,
    }
  }

  return {
    register,
    setEnabled,
    getInjectionKey,
  }
}

export function createWebStorageComposable<T extends Record<string, unknown>>(
  injectionKey: InjectionKey<ContextStorageHandler<T, RegisterWebStorageHandlerOptions<T>>>,
  handlerName: string,
) {
  return function useContextStorageWebStorage(
    data: MaybeRefOrGetter<T>,
    options: RegisterWebStorageHandlerOptions<T>,
  ): UseContextStorageResult<T> {
    const handler =
      inject<ContextStorageHandler<T, RegisterWebStorageHandlerOptions<T>>>(injectionKey)

    if (!handler) {
      throw new Error(`[vue-context-storage] ${handlerName} is not provided`)
    }

    return buildContextStorageHandler(handler, data, options)
  }
}
