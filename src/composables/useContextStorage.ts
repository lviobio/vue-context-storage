import { getCurrentInstance, inject, type MaybeRefOrGetter, onBeforeUnmount } from 'vue'
import { type ContextStorageHandlerMap, resolveHandlerInjectionKey } from '../registry'
import type { UseContextStorageResult } from './types'

export function useContextStorage<K extends keyof ContextStorageHandlerMap<T>, T>(
  type: K,
  data: MaybeRefOrGetter<T>,
  options: ContextStorageHandlerMap<T>[K],
): UseContextStorageResult<T> {
  const injectionKey = resolveHandlerInjectionKey<K, T>(type)
  if (!injectionKey) {
    throw new Error(
      `[vue-context-storage] Unknown handler type: "${type}". Use defineContextStorageHandler() to register it.`,
    )
  }

  const handler = inject(injectionKey)
  if (!handler) {
    throw new Error(`[vue-context-storage] Handler not provided for type: "${String(type)}"`)
  }

  const currentInstance = getCurrentInstance()
  const uid = currentInstance?.uid || 0
  const causer = new Error().stack?.split('\n')[2]?.trimStart() || 'unknown'

  const { stop, wasChanged } = handler.register(data, { causer, uid, ...options })
  onBeforeUnmount(() => {
    stop()
  })

  return {
    data,
    stop,
    wasChanged,
  }
}
