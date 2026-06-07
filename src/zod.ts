import { markRaw } from 'vue'
import type { z, ZodObject, ZodRawShape } from 'zod'
import { zodDefType } from './handlers/helpers'

export const SCHEMA_SYMBOL: unique symbol = Symbol('schema')

/**
 * This type is "Maybe", but always has a schema attached to it.
 * It's used to avoid any type errors with transformations.
 */
export type MaybeWithSchema<T extends ZodRawShape> = z.infer<ZodObject<T>> & {
  [SCHEMA_SYMBOL]?: ZodObject<T>
}

/**
 * Creates an object with empty values based on a Zod schema.
 * Useful for initializing forms.
 *
 * When `withSchema` is `true`, attaches the schema to the result via `SCHEMA_SYMBOL`
 * (wrapped with `markRaw` to prevent Vue reactivity on the schema instance).
 *
 * Implemented via duck-typed introspection (`_zod.def.type`) — `zod` is only
 * imported as types, so the main bundle never depends on it at runtime.
 */
export function createEmptyZodObject<T extends ZodRawShape>(
  schema: ZodObject<T>,
  options: { useDefaults?: boolean; withSchema: true },
): MaybeWithSchema<T>
export function createEmptyZodObject<T extends ZodRawShape>(
  schema: ZodObject<T>,
  options?: { useDefaults?: boolean; withSchema?: false },
): z.infer<ZodObject<T>>
export function createEmptyZodObject<T extends ZodRawShape>(
  schema: ZodObject<T>,
  options?: {
    useDefaults?: boolean
    withSchema?: boolean
  },
): MaybeWithSchema<T> {
  const shape = schema.shape
  const result: any = {}

  const { useDefaults = true } = options || {}

  for (const key in shape) {
    const field = shape[key] as unknown

    // Collect wrapper flags (default/nullable/optional) along the unwrap chain
    let hasDefault = false
    let isNullable = false
    let isOptional = false
    let base = field
    while (true) {
      const type = zodDefType(base)
      if (type === 'default') {
        hasDefault = true
      } else if (type === 'nullable') {
        isNullable = true
      } else if (type === 'optional') {
        isOptional = true
      } else {
        break
      }
      base = (base as any).unwrap()
    }

    if (useDefaults && hasDefault) {
      // Use parse(undefined) to retrieve the default value through the public API
      result[key] = (field as any).parse(undefined)
      continue
    }

    // If the field is nullable, use null as the default
    if (isNullable) {
      result[key] = null
      continue
    }

    // If the field is optional, use undefined as the default
    if (isOptional) {
      result[key] = undefined
      continue
    }

    // Determine the default value based on the base type
    const baseType = zodDefType(base)

    if (baseType === 'string') {
      result[key] = ''
    } else if (baseType === 'number') {
      // Учитываем positive() и min() constraints, чтобы дефолт проходил валидацию
      // Используем публичный minValue геттер и safeParse для проверки
      const minValue = (base as any).minValue
      let defaultValue =
        minValue !== null && minValue !== undefined && isFinite(minValue) ? minValue : 0
      if (!(base as any).safeParse(defaultValue).success) {
        // minValue doesn't pass validation (exclusive min, e.g. positive())
        defaultValue += 1
      }
      result[key] = defaultValue
    } else if (baseType === 'boolean') {
      result[key] = false
    } else if (baseType === 'array') {
      result[key] = []
    } else if (baseType === 'object' && (base as any).shape) {
      result[key] = createEmptyZodObject(
        base as any,
        {
          useDefaults: options?.useDefaults,
          withSchema: options?.withSchema,
        } as any,
      )
    } else if (baseType === 'date') {
      result[key] = null
    } else {
      // For all other types (literal, union, enum, transform, refine, tuple, record, …)
      result[key] = undefined
    }
  }

  if (options?.withSchema) {
    result[SCHEMA_SYMBOL] = markRaw(schema)
  }

  return result
}
