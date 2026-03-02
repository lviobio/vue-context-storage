import {
  getCurrentInstance,
  inject,
  type InjectionKey,
  type MaybeRefOrGetter,
  onBeforeUnmount,
  toValue,
} from 'vue'
import { merge, pick } from 'lodash'
import type { ContextStorageHandler, RegisterBaseOptions } from '../handlers'
import type { HandlerSchema } from './types'
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

export interface ApplyTransformInput<T extends Record<string, unknown>> {
  state: Record<string, unknown>
  initialData: T
  schema?: Pick<HandlerSchema<T>, 'safeParse'>
  transform?: (deserialized: any, initialData: T) => any
  mergeOnlyExistingKeysWithoutTransform: boolean
}

export interface ApplyTransformWarning {
  message: string
  args: unknown[]
}

export interface ApplyTransformResult {
  data: Record<string, unknown>
  warnings: ApplyTransformWarning[]
}

/**
 * Applies schema validation, transform function, or default key-picking to deserialized state.
 * Priority: schema > transform > default merge (pick existing keys).
 *
 * On schema parse failure, falls back to initialData.
 */
export function applyTransform<T extends Record<string, unknown>>(
  input: ApplyTransformInput<T>,
): ApplyTransformResult {
  const warnings: ApplyTransformWarning[] = []
  let data: Record<string, unknown> = input.state

  // Priority: schema > transform > default merge
  if (input.schema) {
    // Deep merge initialData with state so missing nested objects
    // don't cause "expected object, received undefined" schema errors.
    // State values take priority over initialData.
    const merged = merge({}, input.initialData, data)
    const result = input.schema.safeParse(merged)

    if (result.success) {
      data = result.data
    } else {
      warnings.push({ message: '[vue-context-storage] schema parse failed', args: [result.error] })
      data = { ...input.initialData }
    }

    if (input.transform) {
      warnings.push({
        message: '[vue-context-storage] transform is not supported with schema',
        args: [],
      })
    }
  } else if (input.transform) {
    data = input.transform(data as any, input.initialData)
  } else {
    if (input.mergeOnlyExistingKeysWithoutTransform) {
      data = pick(data, Object.keys(input.initialData))
    }
  }

  return { data, warnings }
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
