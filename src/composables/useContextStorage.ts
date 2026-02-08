import { inject, type MaybeRefOrGetter } from 'vue'
import { type ContextStorageHandlerMap, resolveHandlerInjectionKey } from '../registry'
import type { UseContextStorageResult } from './types'
import { buildContextStorageHandler } from '../handlers/helpers'

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

  return buildContextStorageHandler(handler, data, options)
}
