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
 * Creates a Zod schema for arrays of objects serialized as indexed query parameters.
 *
 * URL query parameters serialize arrays of objects as indexed keys:
 * `items[0][product]=Apple&items[0][quantity]=5&items[1][product]=Banana&items[1][quantity]=10`
 *
 * After deserialization, these become indexed objects:
 * `{ '0': { product: 'Apple', quantity: '5' }, '1': { product: 'Banana', quantity: '10' } }`
 *
 * This helper wraps `z.record()` + `.transform()` to convert them back to a typed array,
 * so you don't have to write the boilerplate yourself.
 *
 * @example
 * ```ts
 * import { z } from 'zod'
 * import { zObjectArray } from 'vue-context-storage/zod'
 *
 * const ItemSchema = z.object({
 *   product: z.string().default(''),
 *   quantity: z.coerce.number().default(0),
 * })
 *
 * const DataSchema = z.object({
 *   title: z.string().default(''),
 *   items: zObjectArray(ItemSchema),
 * })
 *
 * useContextStorage('query', data, { schema: DataSchema })
 * ```
 */
export function zObjectArray<T extends z.ZodTypeAny>(itemSchema: T) {
  return z
    .record(z.string(), itemSchema)
    .default({})
    .transform((record) =>
      Object.entries(record)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([, v]) => v),
    )
}

/**
 * Creates a Zod schema for booleans serialized as URL query parameters.
 *
 * URL query parameters serialize booleans as `'1'`/`'0'` strings.
 * `z.coerce.boolean()` cannot be used because `Boolean('0')` is `true` in JavaScript.
 *
 * This helper accepts only `'1'`/`'0'` strings and native booleans — matching
 * the serialization format used by the query handler.
 *
 * @param defaultValue - The default value when the field is missing (defaults to `false`)
 *
 * @example
 * ```ts
 * import { z } from 'zod'
 * import { zBoolean } from 'vue-context-storage/zod'
 *
 * const Schema = z.object({
 *   active: zBoolean(),        // defaults to false
 *   enabled: zBoolean(true),   // defaults to true
 * })
 * ```
 */
export function zBoolean(defaultValue = false) {
  return z
    .union([z.boolean(), z.enum(['1', '0'])])
    .transform((val) => {
      if (typeof val === 'boolean') return val
      return val === '1'
    })
    .default(defaultValue)
}

/**
 * Creates a Zod schema for arrays of numbers serialized as URL query parameters.
 *
 * URL query parameters serialize arrays as repeated keys:
 * `?users_ids=1&users_ids=2` → `['1', '2']` (array of strings)
 *
 * But when only one value is present:
 * `?users_ids=1` → `'1'` (just a string, not an array)
 *
 * `z.coerce.number().array()` would fail with "expected array, received string"
 * for the single-value case. This helper normalizes the input by wrapping
 * a single value into an array before coercing each element to a number.
 *
 * @example
 * ```ts
 * import { z } from 'zod'
 * import { zNumberArray } from 'vue-context-storage/zod'
 *
 * const Schema = z.object({
 *   users_ids: zNumberArray(),
 * })
 *
 * // All of these work:
 * Schema.parse({ users_ids: ['1', '2'] })  // → { users_ids: [1, 2] }
 * Schema.parse({ users_ids: '1' })          // → { users_ids: [1] }
 * Schema.parse({})                           // → { users_ids: [] }
 * ```
 */
export function zNumberArray() {
  return z.union([z.coerce.number().array(), z.coerce.number().transform((v) => [v])]).default([])
}

/**
 * Creates a Zod schema for arrays of strings serialized as URL query parameters.
 *
 * URL query parameters serialize arrays as repeated keys:
 * `?tags=vue&tags=react` → `['vue', 'react']` (array of strings)
 *
 * But when only one value is present:
 * `?tags=vue` → `'vue'` (just a string, not an array)
 *
 * `z.string().array()` would fail with "expected array, received string"
 * for the single-value case. This helper normalizes the input by wrapping
 * a single value into an array.
 *
 * @example
 * ```ts
 * import { z } from 'zod'
 * import { zStringArray } from 'vue-context-storage/zod'
 *
 * const Schema = z.object({
 *   tags: zStringArray(),
 * })
 *
 * // All of these work:
 * Schema.parse({ tags: ['vue', 'react'] })  // → { tags: ['vue', 'react'] }
 * Schema.parse({ tags: 'vue' })              // → { tags: ['vue'] }
 * Schema.parse({})                            // → { tags: [] }
 * ```
 */
export function zStringArray() {
  return z.union([z.string().array(), z.string().transform((v) => [v])]).default([])
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
    } else if (field instanceof z.ZodOptional || field instanceof z.ZodNullable) {
      // For nullable/optional fields, use undefined
      result[key] = undefined
    } else {
      // For all other types (including transform/refine), use undefined
      result[key] = undefined
    }
  }

  if (options?.withSchema) {
    result[SCHEMA_SYMBOL] = markRaw(schema)
  }

  return result
}
