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
 * Reads the Zod `.meta()` from a field, traversing the unwrap chain
 * (`default` → `optional` → `nullable`) to find meta at any level.
 *
 * Checks the outermost wrapper first, then walks inward via `.unwrap()`.
 * Returns the first non-undefined meta found, or `undefined`.
 *
 * Uses duck-typing only — never imports `zod` directly.
 */
function readZodFieldMeta(field: unknown): Record<string, unknown> | undefined {
  let t = field
  while (true) {
    const m = typeof (t as any)?.meta === 'function' ? (t as any).meta() : undefined
    if (m !== undefined) return m
    const type = zodDefType(t)
    if (type === 'default' || type === 'optional' || type === 'nullable') {
      t = (t as any).unwrap()
    } else {
      break
    }
  }
  return undefined
}

/**
 * Walks a Zod object schema's `.shape` and collects `additionalDefaultData`
 * values from field-level `.meta({ additionalDefaultData: ... })`.
 *
 * Supports nested `ZodObject` shapes — produces a nested result object.
 *
 * Returns `undefined` if no field has `additionalDefaultData` in its meta.
 *
 * @example
 * ```ts
 * const Schema = z.object({
 *   page: z.coerce.number().default(1).meta({ additionalDefaultData: 1 }),
 *   search: z.string().default(''),
 * })
 * extractAdditionalDefaultDataFromSchema(Schema)
 * // → { page: 1 }
 * ```
 */
export function extractAdditionalDefaultDataFromSchema(
  schema: unknown,
): Record<string, unknown> | undefined {
  const shape = (schema as any)?.shape
  if (!shape || typeof shape !== 'object') return undefined

  let result: Record<string, unknown> | undefined

  for (const key of Object.keys(shape)) {
    const meta = readZodFieldMeta(shape[key])
    if (meta && 'additionalDefaultData' in meta) {
      if (!result) result = {}
      result[key] = meta.additionalDefaultData
    } else {
      // Check for nested object schemas
      const base = unwrapZodField(shape[key])
      if (zodDefType(base) === 'object' && (base as any).shape) {
        const nested = extractAdditionalDefaultDataFromSchema(base)
        if (nested) {
          if (!result) result = {}
          result[key] = nested
        }
      }
    }
  }

  return result
}

/**
 * Reads the value of a Zod `.default()` from a field, traversing the
 * `optional`/`nullable` wrappers to reach the `default` node underneath.
 *
 * Zod v4 stores the default value (not a thunk) at `_zod.def.defaultValue`.
 *
 * Returns `{ hasDefault: true, value }` when a default is found, otherwise
 * `{ hasDefault: false }`.  Uses duck-typing only — never imports `zod`.
 */
function readZodFieldDefault(field: unknown): { hasDefault: boolean; value?: unknown } {
  let t = field
  while (true) {
    const type = zodDefType(t)
    if (type === 'default') {
      return { hasDefault: true, value: (t as any)._zod.def.defaultValue }
    }
    if (type === 'optional' || type === 'nullable') {
      t = (t as any).unwrap()
    } else {
      break
    }
  }
  return { hasDefault: false }
}

/**
 * Walks a Zod object schema's `.shape` and collects the values declared via
 * field-level `.default(...)`.
 *
 * These values are treated as additional "default" baselines for the
 * `onlyChanges` comparison in the query handler: a field whose current value
 * equals its schema default is omitted from the URL, exactly like the initial
 * snapshot and `additionalDefaultData`.
 *
 * Nested `ZodObject` shapes are processed recursively (per-field), so a nested
 * object contributes a nested result of its leaf defaults.
 *
 * Returns `undefined` if no field declares a `.default()`.
 *
 * @example
 * ```ts
 * const Schema = z.object({
 *   page: z.coerce.number().default(1),
 *   search: z.string().default(''),
 * })
 * extractDefaultsFromSchema(Schema)
 * // → { page: 1, search: '' }
 * ```
 */
export function extractDefaultsFromSchema(schema: unknown): Record<string, unknown> | undefined {
  const shape = (schema as any)?.shape
  if (!shape || typeof shape !== 'object') return undefined

  let result: Record<string, unknown> | undefined

  for (const key of Object.keys(shape)) {
    const base = unwrapZodField(shape[key])

    // Nested object: combine the object-level `.default({...})` value with the
    // granular per-field defaults collected by recursion. Field-level defaults
    // take priority, while the object-level default fills in fields that have no
    // field-level default of their own (the documented best practice declares
    // the default only at the object level).
    if (zodDefType(base) === 'object' && (base as any).shape) {
      const { hasDefault, value: objectDefault } = readZodFieldDefault(shape[key])
      const nested = extractDefaultsFromSchema(base)

      let combined: unknown
      if (hasDefault && nested) {
        combined = merge({}, objectDefault, nested)
      } else if (hasDefault) {
        combined = objectDefault
      } else {
        combined = nested
      }

      if (combined !== undefined) {
        if (!result) result = {}
        result[key] = combined
      }
      continue
    }

    const { hasDefault, value } = readZodFieldDefault(shape[key])
    if (hasDefault) {
      if (!result) result = {}
      result[key] = value
    }
  }

  return result
}

/**
 * Recursively coerces deserialized data to match array fields in a Zod schema.
 *
 * URL query deserialization produces a single value (string/number) when only
 * one query parameter is present (`?ids=1` → `'1'`), but an array when
 * multiple values are present (`?ids=1&ids=2` → `['1', '2']`).
 *
 * Arrays of objects are serialized as indexed keys
 * (`items[0][product]=Apple`), which deserialize into indexed records
 * (`{ '0': { product: 'Apple' } }`) rather than arrays.
 *
 * Without this pre-processing step, `z.string().array()` (or any `.array()`)
 * would reject the single-value case with "expected array, received string",
 * and `z.array(z.object(...))` would reject the indexed-record case with
 * "expected array, received object".
 *
 * The function walks the schema shape (duck-typed via `_zod.def.type` and
 * `.shape`) and, wherever the schema expects an array:
 *  - wraps non-array scalar values into single-element arrays;
 *  - converts indexed records into arrays sorted by numeric key;
 *  - recursively coerces array elements when the element schema is an object.
 *
 * Nested `ZodObject` shapes are processed recursively.
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
      if (value !== undefined && value !== null) {
        let arr: unknown[]
        if (Array.isArray(value)) {
          arr = value
        } else if (typeof value === 'object') {
          // Indexed record from URL deserialization → array sorted by numeric key
          arr = Object.entries(value)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([, v]) => v)
        } else {
          arr = [value]
        }

        // Recursively coerce object elements (booleans, nested arrays inside items)
        const element = (base as any).element ?? (base as any)._zod?.def?.element
        const elementBase = unwrapZodField(element)
        if (zodDefType(elementBase) === 'object' && (elementBase as any).shape) {
          arr = arr.map((v) =>
            v && typeof v === 'object' && !Array.isArray(v)
              ? coerceDataForSchema(v as Record<string, unknown>, elementBase)
              : v,
          )
        }

        result[key] = arr
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
