import { QueryValue } from './types.ts'

interface AsNumberOptions {
  nullable?: boolean
  missable?: boolean
  fallbackValue?: number
}

export function asNumber(value: QueryValue | number | undefined): number
export function asNumber(
  value: QueryValue | number | undefined,
  options: { nullable: true; missable: true; fallbackValue?: number },
): number | null | undefined
export function asNumber(
  value: QueryValue | number | undefined,
  options: { nullable: true; missable?: false; fallbackValue?: number },
): number | null
export function asNumber(
  value: QueryValue | number | undefined,
  options: { nullable?: false; missable: true; fallbackValue?: number },
): number | undefined
export function asNumber(
  value: QueryValue | number | undefined,
  options: { nullable?: false; missable?: false; fallbackValue?: number },
): number
export function asNumber(
  value: QueryValue | number | undefined,
  options?: AsNumberOptions,
): number | null | undefined {
  const {
    nullable = false,
    missable = false,
    fallbackValue = missable ? undefined : nullable ? null : 0,
  } = options || {}

  if (value === null && nullable) {
    return null
  }

  if (value === undefined && missable) {
    return undefined
  }

  value = Number(value)

  return isNaN(value) ? fallbackValue : value
}

interface AsStringOptions<T extends readonly string[] = string[]> {
  nullable?: boolean
  missable?: boolean
  fallbackValue?: T extends readonly string[] ? T[number] : string
  allowedValues?: T
}

export function asString(value: QueryValue | undefined): string
export function asString<T extends readonly string[]>(
  value: QueryValue | undefined,
  options: {
    nullable: true
    missable: true
    fallbackValue?: T[number]
    allowedValues: T
  },
): T[number] | null | undefined
export function asString<T extends readonly string[]>(
  value: QueryValue | undefined,
  options: {
    nullable: true
    missable?: false
    fallbackValue?: T[number]
    allowedValues: T
  },
): T[number] | null
export function asString<T extends readonly string[]>(
  value: QueryValue | undefined,
  options: {
    nullable?: false
    missable: true
    fallbackValue?: T[number]
    allowedValues: T
  },
): T[number] | undefined
export function asString<T extends readonly string[]>(
  value: QueryValue | undefined,
  options: {
    nullable?: false
    missable?: false
    fallbackValue?: T[number]
    allowedValues: T
  },
): T[number]
export function asString(
  value: QueryValue | undefined,
  options: { nullable: true; missable: true; fallbackValue?: string },
): string | null | undefined
export function asString(
  value: QueryValue | undefined,
  options: { nullable: true; missable?: false; fallbackValue?: string },
): string | null
export function asString(
  value: QueryValue | undefined,
  options: { nullable?: false; missable: true; fallbackValue?: string },
): string | undefined
export function asString(
  value: QueryValue | undefined,
  options: { nullable?: false; missable?: false; fallbackValue?: string },
): string
export function asString(
  value: QueryValue | undefined,
  options?: AsStringOptions,
): QueryValue | undefined {
  const {
    nullable = false,
    missable = false,
    fallbackValue = missable ? undefined : nullable ? null : '',
    allowedValues,
  } = options || {}

  if (value === null && nullable) {
    return null
  }

  if (value === undefined && missable) {
    return undefined
  }

  const stringValue = value ?? fallbackValue

  if (allowedValues && typeof stringValue === 'string' && !allowedValues.includes(stringValue)) {
    return fallbackValue
  }

  return stringValue
}

interface AsNumberArrayOptions {
  nullable?: boolean
}

export function asNumberArray(value: QueryValue | undefined): number[]
export function asNumberArray(
  value: QueryValue | undefined,
  options: { nullable: true },
): number[] | null
export function asNumberArray(
  value: QueryValue | undefined,
  options: { nullable?: false },
): number[]
export function asNumberArray(
  value: QueryValue | undefined,
  options?: AsNumberArrayOptions,
): number[] | null {
  const { nullable = false } = options || {}

  if (value === null && nullable) {
    return null
  }

  if (value === undefined) {
    return nullable ? null : []
  }

  let arrayValue: (string | null)[]

  if (Array.isArray(value)) {
    arrayValue = value
  } else if (typeof value === 'string') {
    arrayValue = [value]
  } else {
    arrayValue = []
  }

  return arrayValue.map((item) => {
    if (item === null) {
      return 0
    }
    const num = Number(item)
    return isNaN(num) ? 0 : num
  })
}

interface AsArrayOptions<T> {
  nullable?: boolean
  missable?: boolean
  transform?: (value: QueryValue) => T
}

export function asArray<T>(value: QueryValue | undefined): T[]
export function asArray<T>(
  value: QueryValue | undefined,
  options: { nullable: true; missable: true; transform?: (value: QueryValue) => T },
): T[] | null | undefined
export function asArray<T>(
  value: QueryValue | undefined,
  options: { nullable: true; missable?: false; transform?: (value: QueryValue) => T },
): T[] | null
export function asArray<T>(
  value: QueryValue | undefined,
  options: { nullable?: false; missable: true; transform?: (value: QueryValue) => T },
): T[] | undefined
export function asArray<T>(
  value: QueryValue | undefined,
  options: { nullable?: false; missable?: false; transform?: (value: QueryValue) => T },
): T[]
export function asArray<T>(
  value: QueryValue | undefined,
  options?: AsArrayOptions<T>,
): T[] | null | undefined {
  const { nullable = false, missable = false, transform } = options || {}

  if (value === null && nullable) {
    return null
  }

  if (value === undefined && missable) {
    return undefined
  }

  if (value === undefined) {
    return nullable ? null : []
  }

  let arrayValue: QueryValue[]

  if (Array.isArray(value)) {
    arrayValue = value
  } else {
    arrayValue = [value]
  }

  if (transform) {
    return arrayValue.map((item) => transform(item))
  }

  return arrayValue as T[]
}

interface AsBooleanOptions {
  nullable?: boolean
  missable?: boolean
  fallbackValue?: boolean
}

export function asBoolean(value: QueryValue | undefined): boolean
export function asBoolean(
  value: QueryValue | undefined,
  options: { nullable: true; missable: true; fallbackValue?: boolean },
): boolean | null | undefined
export function asBoolean(
  value: QueryValue | undefined,
  options: { nullable: true; missable?: false; fallbackValue?: boolean },
): boolean | null
export function asBoolean(
  value: QueryValue | undefined,
  options: { nullable?: false; missable: true; fallbackValue?: boolean },
): boolean | undefined
export function asBoolean(
  value: QueryValue | undefined,
  options: { nullable?: false; missable?: false; fallbackValue?: boolean },
): boolean
export function asBoolean(
  value: QueryValue | undefined,
  options?: AsBooleanOptions,
): boolean | null | undefined {
  const {
    nullable = false,
    missable = false,
    fallbackValue = missable ? undefined : nullable ? null : false,
  } = options || {}

  if (value === null && nullable) {
    return null
  }

  if (value === undefined && missable) {
    return undefined
  }

  if (value === undefined || value === null) {
    return fallbackValue
  }

  if (typeof value === 'string') {
    const lowerValue = value.toLowerCase()
    if (lowerValue === 'true' || lowerValue === '1') {
      return true
    }
    if (lowerValue === 'false' || lowerValue === '0') {
      return false
    }
  }

  return fallbackValue
}

export const transform: {
  asString: typeof asString
  asNumber: typeof asNumber
  asArray: typeof asArray
  asNumberArray: typeof asNumberArray
  asBoolean: typeof asBoolean
} = {
  asString,
  asNumber,
  asArray,
  asNumberArray,
  asBoolean,
}
