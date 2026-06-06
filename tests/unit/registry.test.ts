import { describe, expect, it } from 'vitest'
import type { InjectionKey } from 'vue'
import {
  type ContextStorageHandler,
  defineContextStorageHandler,
  resolveHandlerInjectionKey,
} from '../../src/registry'
import {
  contextStorageLocalStorageHandlerInjectKey,
  contextStorageQueryHandlerInjectKey,
  contextStorageSessionStorageHandlerInjectKey,
} from '../../src/injectionSymbols'

describe('registry', () => {
  it('resolves the built-in query handler', () => {
    expect(resolveHandlerInjectionKey('query')).toBe(contextStorageQueryHandlerInjectKey)
  })

  it('resolves the built-in localStorage handler', () => {
    expect(resolveHandlerInjectionKey('localStorage')).toBe(
      contextStorageLocalStorageHandlerInjectKey,
    )
  })

  it('resolves the built-in sessionStorage handler', () => {
    expect(resolveHandlerInjectionKey('sessionStorage')).toBe(
      contextStorageSessionStorageHandlerInjectKey,
    )
  })

  it('returns undefined for an unknown handler type', () => {
    expect(resolveHandlerInjectionKey('does-not-exist' as never)).toBeUndefined()
  })

  it('registers and resolves a custom handler', () => {
    const key = Symbol('custom') as InjectionKey<ContextStorageHandler<unknown, object>>
    defineContextStorageHandler('customHandler', key)
    expect(resolveHandlerInjectionKey('customHandler' as never)).toBe(key)
  })

  it('registers a custom handler with prefix options', () => {
    const key = Symbol('custom-prefixed') as InjectionKey<ContextStorageHandler<unknown, object>>
    defineContextStorageHandler('customPrefixed', key, {
      prefixProperty: 'name',
      prefixMergeStrategy: 'append',
    })
    expect(resolveHandlerInjectionKey('customPrefixed' as never)).toBe(key)
  })
})
