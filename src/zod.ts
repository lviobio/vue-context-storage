import { markRaw } from 'vue'
import { z, type ZodObject, type ZodRawShape } from 'zod'

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
 */
export function createEmptyObject<T extends ZodRawShape>(
  schema: ZodObject<T>,
  options: { useDefaults?: boolean; withSchema: true },
): MaybeWithSchema<T>
export function createEmptyObject<T extends ZodRawShape>(
  schema: ZodObject<T>,
  options?: { useDefaults?: boolean; withSchema?: false },
): z.infer<ZodObject<T>>
export function createEmptyObject<T extends ZodRawShape>(
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
    const field = shape[key] as unknown as z.ZodType<any>

    if (useDefaults) {
      // Check for a default value via ZodDefault.
      // Use parse(undefined) to retrieve the default value through the public API
      let hasDefault = false
      let currentType: z.ZodType<any> = field

      while (
        currentType instanceof z.ZodOptional ||
        currentType instanceof z.ZodNullable ||
        currentType instanceof z.ZodDefault
      ) {
        if (currentType instanceof z.ZodDefault) {
          hasDefault = true
          break
        }
        currentType = currentType.unwrap() as z.ZodType<any>
      }

      if (hasDefault) {
        // Use parse to retrieve the default value
        result[key] = field.parse(undefined)
        continue
      }
    }

    // Check if the field is nullable/optional
    // Important: also unwrap ZodDefault to reach the inner type
    let isNullable = false
    let isOptional = false
    let checkType: z.ZodType<any> = field
    while (
      checkType instanceof z.ZodOptional ||
      checkType instanceof z.ZodNullable ||
      checkType instanceof z.ZodDefault
    ) {
      if (checkType instanceof z.ZodNullable) {
        isNullable = true
      }
      if (checkType instanceof z.ZodOptional) {
        isOptional = true
      }
      checkType = checkType.unwrap() as z.ZodType<any>
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

    // Get the base type by unwrapping optional/nullable/default wrappers
    let baseType: z.ZodType<any> = field
    while (
      baseType instanceof z.ZodOptional ||
      baseType instanceof z.ZodNullable ||
      baseType instanceof z.ZodDefault
    ) {
      baseType = baseType.unwrap() as z.ZodType<any>
    }

    // Determine the default value based on the base type
    if (baseType instanceof z.ZodString) {
      result[key] = ''
    } else if (baseType instanceof z.ZodNumber) {
      // Учитываем positive() и min() constraints, чтобы дефолт проходил валидацию
      // Используем публичный minValue геттер и safeParse для проверки
      let defaultValue =
        baseType.minValue !== null && baseType.minValue !== undefined && isFinite(baseType.minValue)
          ? baseType.minValue
          : 0
      if (!baseType.safeParse(defaultValue).success) {
        // minValue doesn't pass validation (exclusive min, e.g. positive())
        defaultValue += 1
      }
      result[key] = defaultValue
    } else if (baseType instanceof z.ZodBoolean) {
      result[key] = false
    } else if (baseType instanceof z.ZodArray) {
      result[key] = []
    } else if (baseType instanceof z.ZodObject) {
      result[key] = createEmptyObject(baseType, {
        useDefaults: options?.useDefaults,
        withSchema: options?.withSchema,
      } as any)
    } else if (baseType instanceof z.ZodDate) {
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
