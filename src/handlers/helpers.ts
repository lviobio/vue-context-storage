import {
  getCurrentInstance,
  inject,
  type InjectionKey,
  type MaybeRefOrGetter,
  onBeforeUnmount,
  toValue,
} from 'vue'
import type { ContextStorageHandler, RegisterBaseOptions } from '../handlers'
import { contextStoragePrefixSegmentsInjectKey, resolvePrefixSegments } from '../prefix'

/**
 * Fully synchronizes a reactive target object with source data.
 * Unlike lodash `merge`, this also removes keys from target that are not present in source.
 * This is necessary because Vue reactive proxies cannot be replaced — only mutated in place.
 */
export function syncReactive<T extends Record<string, unknown>>(
  target: T,
  source: Record<string, unknown>,
): void {
  // Remove keys that are not in source
  for (const key of Object.keys(target)) {
    if (!(key in source)) {
      delete target[key]
    }
  }
  // Assign all keys from source
  Object.assign(target, source)
}

/**
 * Maps handler injection keys to their handler type names (e.g. 'query', 'localStorage').
 * This is used to resolve per-handler prefix segments from ContextStoragePrefix components.
 */
const knownHandlerKeys = new Map<InjectionKey<unknown>, string>()

export function registerKnownHandlerKey(
  injectionKey: InjectionKey<unknown>,
  handlerType: string,
): void {
  knownHandlerKeys.set(injectionKey, handlerType)
}

export function buildContextStorageHandler<T, O extends RegisterBaseOptions<T>>(
  handler: ContextStorageHandler<T, O>,
  data: MaybeRefOrGetter<T>,
  options?: O,
) {
  const currentInstance = getCurrentInstance()
  const uid = currentInstance?.uid || 0

  const causer = new Error().stack?.split('\n')[3]?.trimStart() || 'unknown'

  const mergedOptions = { causer, uid, ...options } as O

  // Resolve prefix from ContextStoragePrefix components
  const rawPrefixSegments = inject(contextStoragePrefixSegmentsInjectKey, undefined)
  const prefixSegments = rawPrefixSegments ? toValue(rawPrefixSegments) : undefined
  if (prefixSegments && prefixSegments.length > 0) {
    const handlerInjectionKey = handler.getInjectionKey()
    const resolvedPrefix = resolvePrefixSegments(
      prefixSegments,
      handlerInjectionKey,
      knownHandlerKeys,
    )

    if (resolvedPrefix) {
      const optionsPrefix = (mergedOptions as Record<string, unknown>).prefix as string | undefined
      if (optionsPrefix) {
        ;(mergedOptions as Record<string, unknown>).prefix = `${resolvedPrefix}[${optionsPrefix}]`
      } else {
        ;(mergedOptions as Record<string, unknown>).prefix = resolvedPrefix
      }
    }
  }

  const { stop, reset, wasChanged } = handler.register(data, mergedOptions)
  onBeforeUnmount(() => {
    stop()
  })

  return { data, stop, reset, wasChanged }
}
