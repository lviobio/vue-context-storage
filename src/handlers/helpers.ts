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
 * Maps handler injection keys to their handler type names and prefix property names.
 * This is used to resolve per-handler prefix segments from ContextStoragePrefix components.
 */
interface KnownHandlerInfo {
  handlerType: string
  /** The options property name that receives the resolved ContextStoragePrefix value (default: 'key'). */
  prefixProperty: string
  /**
   * How ContextStoragePrefix is merged with the user's value:
   * - 'prepend': `${prefix}[${value}]` (e.g. query: tables[filters])
   * - 'append':  `${value}[${prefix}]` (e.g. web-storage: app-state[tables])
   */
  prefixMergeStrategy: 'prepend' | 'append'
}

const knownHandlerKeys = new Map<InjectionKey<unknown>, KnownHandlerInfo>()

export function registerKnownHandlerKey(
  injectionKey: InjectionKey<unknown>,
  handlerType: string,
  prefixProperty: string = 'key',
  prefixMergeStrategy: 'prepend' | 'append' = 'prepend',
): void {
  knownHandlerKeys.set(injectionKey, { handlerType, prefixProperty, prefixMergeStrategy })
}

/**
 * Appends a bracket-notation suffix to a base string.
 * e.g. appendBracketNotation('state', 'tables[first]') → 'state[tables][first]'
 */
function appendBracketNotation(base: string, suffix: string): string {
  const bracketIdx = suffix.indexOf('[')
  if (bracketIdx === -1) {
    return `${base}[${suffix}]`
  }
  return `${base}[${suffix.slice(0, bracketIdx)}]${suffix.slice(bracketIdx)}`
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
    const handlerInfo = knownHandlerKeys.get(handlerInjectionKey)
    const resolvedPrefix = resolvePrefixSegments(prefixSegments, handlerInfo?.handlerType)

    if (resolvedPrefix) {
      const prefixProp = handlerInfo?.prefixProperty ?? 'key'
      const strategy = handlerInfo?.prefixMergeStrategy ?? 'prepend'
      const optionsValue = (mergedOptions as Record<string, unknown>)[prefixProp] as
        | string
        | undefined
      if (optionsValue) {
        if (strategy === 'append') {
          ;(mergedOptions as Record<string, unknown>)[prefixProp] = appendBracketNotation(
            optionsValue,
            resolvedPrefix,
          )
        } else {
          ;(mergedOptions as Record<string, unknown>)[prefixProp] =
            `${resolvedPrefix}[${optionsValue}]`
        }
      } else {
        ;(mergedOptions as Record<string, unknown>)[prefixProp] = resolvedPrefix
      }
    }
  }

  const { stop, reset, wasChanged } = handler.register(data, mergedOptions)
  onBeforeUnmount(() => {
    stop()
  })

  return { data, stop, reset, wasChanged }
}
