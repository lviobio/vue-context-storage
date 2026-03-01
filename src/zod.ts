import { z } from 'zod'

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
