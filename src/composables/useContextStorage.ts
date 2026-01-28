import {
  getCurrentInstance,
  inject,
  type InjectionKey,
  type MaybeRefOrGetter,
  onBeforeUnmount,
} from 'vue'
import type { ContextStorageHandler } from '../handlers'
import { type ContextStorageHandlerMap, resolveHandlerInjectionKey } from '../registry'

export function useContextStorage<
  K extends keyof ContextStorageHandlerMap,
  T extends Record<string, unknown>,
>(type: K, data: MaybeRefOrGetter<T>, options: ContextStorageHandlerMap[K]): void

export function useContextStorage<T extends Record<string, unknown>>(
  type: InjectionKey<ContextStorageHandler>,
  data: MaybeRefOrGetter<T>,
  options?: Record<string, unknown>,
): void

export function useContextStorage(
  type: string | symbol | InjectionKey<ContextStorageHandler>,
  data: MaybeRefOrGetter<any>,
  options?: any,
): void {
  let injectionKey: InjectionKey<ContextStorageHandler>

  if (typeof type === 'string') {
    const resolved = resolveHandlerInjectionKey(type)
    if (!resolved) {
      throw new Error(
        `[vue-context-storage] Unknown handler type: "${type}". Use defineContextStorageHandler() to register it.`,
      )
    }
    injectionKey = resolved
  } else {
    injectionKey = type as InjectionKey<ContextStorageHandler>
  }

  const handler = inject(injectionKey)
  if (!handler) {
    throw new Error(`[vue-context-storage] Handler not provided for type: "${String(type)}"`)
  }

  const currentInstance = getCurrentInstance()
  const uid = currentInstance?.uid || 0
  const causer = new Error().stack?.split('\n')[2]?.trimStart() || 'unknown'

  const stop = handler.register(data, { causer, uid, ...options })
  onBeforeUnmount(() => {
    stop()
  })
}
