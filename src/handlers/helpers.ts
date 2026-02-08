import { getCurrentInstance, type MaybeRefOrGetter, onBeforeUnmount } from 'vue'
import type { ContextStorageHandler, RegisterBaseOptions } from '../handlers'

export function buildContextStorageHandler<T, O extends RegisterBaseOptions<T>>(
  handler: ContextStorageHandler<T, O>,
  data: MaybeRefOrGetter<T>,
  options?: O,
) {
  const currentInstance = getCurrentInstance()
  const uid = currentInstance?.uid || 0

  const causer = new Error().stack?.split('\n')[3]?.trimStart() || 'unknown'

  const { stop, reset, wasChanged } = handler.register(data, { causer, uid, ...options } as O)
  onBeforeUnmount(() => {
    stop()
  })

  return { data, stop, reset, wasChanged }
}
