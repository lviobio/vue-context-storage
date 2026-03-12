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
 * Returns the `_zod.def.type` string of a Zod schema instance, or `undefined`
 * if the value is not a recognisable Zod type.  Works purely via duck-typing
 * so the library never needs to import `zod` directly.
 */
function zodDefType(field: unknown): string | undefined {
  return (field as any)?._zod?.def?.type
}

/**
 * Unwraps Zod wrapper types (`default`, `optional`, `nullable`) to reach
 * the "base" schema underneath (e.g. `ZodArray`, `ZodObject`, `ZodString`).
 */
function unwrapZodField(field: unknown): unknown {
  let t = field
  while (true) {
    const type = zodDefType(t)
    if (type === 'default' || type === 'optional' || type === 'nullable') {
      t = (t as any).unwrap()
    } else {
      break
    }
  }
  return t
}

/**
 * Recursively coerces deserialized data to match array fields in a Zod schema.
 *
 * URL query deserialization produces a single value (string/number) when only
 * one query parameter is present (`?ids=1` → `'1'`), but an array when
 * multiple values are present (`?ids=1&ids=2` → `['1', '2']`).
 *
 * Without this pre-processing step, `z.string().array()` (or any `.array()`)
 * would reject the single-value case with "expected array, received string".
 *
 * The function walks the schema shape (duck-typed via `_zod.def.type` and
 * `.shape`) and wraps non-array values into single-element arrays wherever
 * the schema expects an array.  Nested `ZodObject` shapes are processed
 * recursively.
 *
 * This is a no-op for schemas that are not `ZodObject`-like (no `.shape`).
 */
function coerceDataForSchema(
  data: Record<string, unknown>,
  schema: unknown,
): Record<string, unknown> {
  const shape = (schema as any)?.shape
  if (!shape || typeof shape !== 'object') return data

  const result = { ...data }

  for (const key of Object.keys(shape)) {
    if (!(key in result)) continue

    const base = unwrapZodField(shape[key])
    const baseType = zodDefType(base)

    if (baseType === 'boolean') {
      const value = result[key]
      if (value === '1') {
        result[key] = true
      } else if (value === '0') {
        result[key] = false
      }
    } else if (baseType === 'array') {
      const value = result[key]
      if (value !== undefined && value !== null && !Array.isArray(value)) {
        result[key] = [value]
      }
    } else if (baseType === 'object' && (base as any).shape) {
      const nested = result[key]
      if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
        result[key] = coerceDataForSchema(nested as Record<string, unknown>, base)
      }
    }
  }

  return result
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

    // Coerce single values to arrays where the schema expects `.array()`.
    // This fixes the URL deserialization quirk where `?ids=1` produces `'1'`
    // instead of `['1']`.
    const coerced = coerceDataForSchema(merged, input.schema)

    const result = input.schema.safeParse(coerced)

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
