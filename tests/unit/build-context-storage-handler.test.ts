import { describe, expect, it, vi } from 'vitest'
import { computed, defineComponent, h, type InjectionKey } from 'vue'
import { mount } from '@vue/test-utils'
import { buildContextStorageHandler, registerKnownHandlerKey } from '../../src/handlers/helpers'
import type { ContextStorageHandler, RegisterBaseOptions } from '../../src/handlers'
import { contextStoragePrefixSegmentsInjectKey } from '../../src/prefix'
import type { ContextStoragePrefixSegment } from '../../src/prefix'

type Options = RegisterBaseOptions<Record<string, unknown>> & { key?: string }

/**
 * Builds a stub handler that records the options it was registered with,
 * plus a fresh injection key registered with the given prefix strategy.
 */
function makeStubHandler(handlerType: string, prefixMergeStrategy: 'prepend' | 'append') {
  const key = Symbol(handlerType) as InjectionKey<ContextStorageHandler<unknown, Options>>
  registerKnownHandlerKey(key, handlerType, 'key', prefixMergeStrategy)
  const received: { options?: Options } = {}
  const handler: ContextStorageHandler<unknown, Options> = {
    getInjectionKey: () => key,
    register: (_data, options) => {
      received.options = options
      return { stop: () => {}, reset: () => {}, wasChanged: computed(() => false) }
    },
  }
  return { handler, received }
}

function mountWithPrefix(
  segments: ContextStoragePrefixSegment[] | undefined,
  handler: ContextStorageHandler<unknown, Options>,
  options: Options,
) {
  const Comp = defineComponent({
    setup() {
      buildContextStorageHandler(handler, {}, options)
      return () => h('div')
    },
  })
  return mount(Comp, {
    global: {
      provide: segments ? { [contextStoragePrefixSegmentsInjectKey as symbol]: segments } : {},
    },
  })
}

describe('buildContextStorageHandler', () => {
  it('passes options through unchanged when there is no prefix', () => {
    const { handler, received } = makeStubHandler('noprefix', 'prepend')
    mountWithPrefix(undefined, handler, { key: 'filters' })
    expect(received.options?.key).toBe('filters')
    // causer + uid are injected by buildContextStorageHandler
    expect(received.options).toHaveProperty('causer')
    expect(received.options).toHaveProperty('uid')
  })

  it('prepends the prefix using the prepend strategy', () => {
    const { handler, received } = makeStubHandler('queryLike', 'prepend')
    mountWithPrefix(['tables'], handler, { key: 'filters' })
    expect(received.options?.key).toBe('tables[filters]')
  })

  it('appends the prefix using the append strategy', () => {
    const { handler, received } = makeStubHandler('storageLike', 'append')
    mountWithPrefix(['tables'], handler, { key: 'state' })
    expect(received.options?.key).toBe('state[tables]')
  })

  it('append strategy inserts before existing brackets in the suffix', () => {
    const { handler, received } = makeStubHandler('storageLike2', 'append')
    mountWithPrefix(['tables[first]'], handler, { key: 'state' })
    expect(received.options?.key).toBe('state[tables][first]')
  })

  it('uses the prefix as the value when no option value exists', () => {
    const { handler, received } = makeStubHandler('queryLike2', 'prepend')
    mountWithPrefix(['tables'], handler, {})
    expect(received.options?.key).toBe('tables')
  })

  it('calls stop when the owning component unmounts', () => {
    const key = Symbol('unmount') as InjectionKey<ContextStorageHandler<unknown, Options>>
    registerKnownHandlerKey(key, 'unmountHandler', 'key', 'prepend')
    const stop = vi.fn()
    const handler: ContextStorageHandler<unknown, Options> = {
      getInjectionKey: () => key,
      register: () => ({ stop, reset: () => {}, wasChanged: computed(() => false) }),
    }
    const Comp = defineComponent({
      setup() {
        buildContextStorageHandler(handler, {}, { key: 'k' })
        return () => h('div')
      },
    })
    const wrapper = mount(Comp)
    expect(stop).not.toHaveBeenCalled()
    wrapper.unmount()
    expect(stop).toHaveBeenCalledTimes(1)
  })

  it('resolves reactive (getter) prefix segments via toValue', () => {
    const { handler, received } = makeStubHandler('reactivePrefix', 'prepend')
    const Comp = defineComponent({
      setup() {
        buildContextStorageHandler(handler, {}, { key: 'filters' })
        return () => h('div')
      },
    })
    mount(Comp, {
      global: {
        provide: { [contextStoragePrefixSegmentsInjectKey as symbol]: () => ['dynamic'] },
      },
    })
    expect(received.options?.key).toBe('dynamic[filters]')
  })
})
