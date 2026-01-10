import { describe, it, expect } from 'vitest'
import {
  asNumber,
  asString,
  asBoolean,
  asArray,
  asNumberArray,
} from '../src/handlers/query/transform-helpers'

describe('asNumber', () => {
  describe('basic usage', () => {
    it('should convert string to number', () => {
      expect(asNumber('42')).toBe(42)
      expect(asNumber('3.14')).toBe(3.14)
      expect(asNumber('-10')).toBe(-10)
    })

    it('should return number as is', () => {
      expect(asNumber(42)).toBe(42)
      expect(asNumber(0)).toBe(0)
    })

    it('should return fallback for invalid values', () => {
      expect(asNumber('invalid')).toBe(0)
      expect(asNumber('')).toBe(0)
      expect(asNumber(undefined)).toBe(0)
    })

    it('should return fallback for null', () => {
      expect(asNumber(null)).toBe(0)
    })
  })

  describe('with fallbackValue', () => {
    it('should use custom fallback value', () => {
      expect(asNumber('invalid', { fallbackValue: 100 })).toBe(100)
      expect(asNumber(undefined, { fallbackValue: -1 })).toBe(-1)
    })
  })

  describe('with nullable option', () => {
    it('should return null for null value', () => {
      expect(asNumber(null, { nullable: true })).toBe(null)
    })

    it('should return null for undefined when nullable', () => {
      expect(asNumber(undefined, { nullable: true })).toBe(null)
    })

    it('should return null for invalid value when nullable without fallback', () => {
      expect(asNumber('invalid', { nullable: true })).toBe(null)
    })

    it('should use fallbackValue when provided with nullable', () => {
      expect(asNumber('invalid', { nullable: true, fallbackValue: 42 })).toBe(42)
    })
  })

  describe('with missable option', () => {
    it('should return undefined for undefined value', () => {
      expect(asNumber(undefined, { missable: true })).toBe(undefined)
    })

    it('should return undefined for invalid value when missable without fallback', () => {
      expect(asNumber('invalid', { missable: true })).toBe(undefined)
    })

    it('should use fallbackValue when provided with missable', () => {
      expect(asNumber('invalid', { missable: true, fallbackValue: 99 })).toBe(99)
    })
  })

  describe('with nullable and missable', () => {
    it('should return null for null', () => {
      expect(asNumber(null, { nullable: true, missable: true })).toBe(null)
    })

    it('should return undefined for undefined', () => {
      expect(asNumber(undefined, { nullable: true, missable: true })).toBe(undefined)
    })
  })
})

describe('asString', () => {
  describe('basic usage', () => {
    it('should return string as is', () => {
      expect(asString('hello')).toBe('hello')
      expect(asString('')).toBe('')
    })

    it('should return empty string for undefined', () => {
      expect(asString(undefined)).toBe('')
    })

    it('should return empty string for null', () => {
      expect(asString(null)).toBe('')
    })
  })

  describe('with fallbackValue', () => {
    it('should use custom fallback value', () => {
      expect(asString(undefined, { fallbackValue: 'default' })).toBe('default')
      expect(asString(null, { fallbackValue: 'N/A' })).toBe('N/A')
    })
  })

  describe('with nullable option', () => {
    it('should return null for null value', () => {
      expect(asString(null, { nullable: true })).toBe(null)
    })

    it('should return null for undefined when nullable', () => {
      expect(asString(undefined, { nullable: true })).toBe(null)
    })
  })

  describe('with missable option', () => {
    it('should return undefined for undefined value', () => {
      expect(asString(undefined, { missable: true })).toBe(undefined)
    })
  })

  describe('with allowedValues', () => {
    const allowed = ['active', 'inactive', 'pending'] as const

    it('should return value if in allowed list', () => {
      expect(asString('active', { allowedValues: allowed })).toBe('active')
      expect(asString('pending', { allowedValues: allowed })).toBe('pending')
    })

    it('should return fallback if not in allowed list', () => {
      expect(asString('invalid', { allowedValues: allowed })).toBe('')
      expect(asString('other', { allowedValues: allowed, fallbackValue: 'active' })).toBe('active')
    })

    it('should handle undefined with allowedValues', () => {
      expect(asString(undefined, { allowedValues: allowed, fallbackValue: 'active' })).toBe(
        'active',
      )
    })
  })
})

describe('asBoolean', () => {
  describe('basic usage', () => {
    it('should convert "true" string to true', () => {
      expect(asBoolean('true')).toBe(true)
      expect(asBoolean('True')).toBe(true)
      expect(asBoolean('TRUE')).toBe(true)
    })

    it('should convert "1" string to true', () => {
      expect(asBoolean('1')).toBe(true)
    })

    it('should convert "false" string to false', () => {
      expect(asBoolean('false')).toBe(false)
      expect(asBoolean('False')).toBe(false)
      expect(asBoolean('FALSE')).toBe(false)
    })

    it('should convert "0" string to false', () => {
      expect(asBoolean('0')).toBe(false)
    })

    it('should return fallback for invalid values', () => {
      expect(asBoolean('invalid')).toBe(false)
      expect(asBoolean('')).toBe(false)
      expect(asBoolean('yes')).toBe(false)
    })

    it('should return fallback for undefined', () => {
      expect(asBoolean(undefined)).toBe(false)
    })

    it('should return fallback for null', () => {
      expect(asBoolean(null)).toBe(false)
    })
  })

  describe('with fallbackValue', () => {
    it('should use custom fallback value', () => {
      expect(asBoolean('invalid', { fallbackValue: true })).toBe(true)
      expect(asBoolean(undefined, { fallbackValue: true })).toBe(true)
    })
  })

  describe('with nullable option', () => {
    it('should return null for null value', () => {
      expect(asBoolean(null, { nullable: true })).toBe(null)
    })

    it('should return null for undefined when nullable', () => {
      expect(asBoolean(undefined, { nullable: true })).toBe(null)
    })

    it('should return null for invalid value when nullable without fallback', () => {
      expect(asBoolean('invalid', { nullable: true })).toBe(null)
    })
  })

  describe('with missable option', () => {
    it('should return undefined for undefined value', () => {
      expect(asBoolean(undefined, { missable: true })).toBe(undefined)
    })

    it('should return undefined for invalid value when missable', () => {
      expect(asBoolean('invalid', { missable: true })).toBe(undefined)
    })
  })
})

describe('asArray', () => {
  describe('basic usage', () => {
    it('should return array as is', () => {
      expect(asArray(['a', 'b', 'c'])).toEqual(['a', 'b', 'c'])
      expect(asArray([])).toEqual([])
    })

    it('should wrap string in array', () => {
      expect(asArray('single')).toEqual(['single'])
    })

    it('should return empty array for undefined', () => {
      expect(asArray(undefined)).toEqual([])
    })

    it('should wrap null in array', () => {
      expect(asArray(null)).toEqual([null])
    })
  })

  describe('with transform', () => {
    it('should apply transform to each element', () => {
      const transform = (v: string | null) => (v ? v.toUpperCase() : '')
      expect(asArray(['a', 'b', 'c'], { transform })).toEqual(['A', 'B', 'C'])
    })

    it('should transform single value', () => {
      const transform = (v: string | null) => Number(v)
      expect(asArray('42', { transform })).toEqual([42])
    })
  })

  describe('with nullable option', () => {
    it('should return null for null value', () => {
      expect(asArray(null, { nullable: true })).toBe(null)
    })

    it('should return null for undefined when nullable', () => {
      expect(asArray(undefined, { nullable: true })).toBe(null)
    })
  })

  describe('with missable option', () => {
    it('should return undefined for undefined value', () => {
      expect(asArray(undefined, { missable: true })).toBe(undefined)
    })
  })
})

describe('asNumberArray', () => {
  describe('basic usage', () => {
    it('should convert string array to number array', () => {
      expect(asNumberArray(['1', '2', '3'])).toEqual([1, 2, 3])
      expect(asNumberArray(['42', '-10', '3.14'])).toEqual([42, -10, 3.14])
    })

    it('should wrap single string in array and convert', () => {
      expect(asNumberArray('42')).toEqual([42])
    })

    it('should return empty array for undefined', () => {
      expect(asNumberArray(undefined)).toEqual([])
    })

    it('should convert invalid values to 0', () => {
      expect(asNumberArray(['1', 'invalid', '3'])).toEqual([1, 0, 3])
      expect(asNumberArray(['', 'NaN'])).toEqual([0, 0])
    })

    it('should convert null values to 0', () => {
      expect(asNumberArray(['1', null, '3'])).toEqual([1, 0, 3])
    })

    it('should return empty array for null', () => {
      expect(asNumberArray(null)).toEqual([])
    })
  })

  describe('with nullable option', () => {
    it('should return null for null value', () => {
      expect(asNumberArray(null, { nullable: true })).toBe(null)
    })

    it('should return null for undefined when nullable', () => {
      expect(asNumberArray(undefined, { nullable: true })).toBe(null)
    })
  })
})
