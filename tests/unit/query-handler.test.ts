import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, reactive } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { z } from 'zod'
import { createQueryHandler } from '../../src/handlers/query'
import { contextStorageQueryHandler } from '../../src/symbols'
import type { ContextStorageHandler } from '../../src/handlers'
import type { RegisterQueryHandlerOptions } from '../../src/handlers/query/types'

type QueryHandler = ContextStorageHandler<
  Record<string, unknown>,
  RegisterQueryHandlerOptions<Record<string, unknown>>
>

interface Harness {
  router: Router
  handler: QueryHandler
  unmount: () => void
}

async function setup(
  baseOptions?: Parameters<typeof createQueryHandler>[0],
  initialQuery: Record<string, string> = {},
): Promise<Harness> {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component: { render: () => h('div') } }],
  })
  await router.push({ path: '/', query: initialQuery })
  await router.isReady()

  let handler!: QueryHandler
  const Comp = defineComponent({
    setup() {
      handler = createQueryHandler(baseOptions)() as QueryHandler
      return () => h('div')
    },
  })
  const wrapper = mount(Comp, { global: { plugins: [router] } })
  return { router, handler, unmount: () => wrapper.unmount() }
}

describe('createQueryHandler', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    // Silence verbose debug logging from the handler.
    vi.spyOn(console, 'debug').mockImplementation(() => {})
  })

  describe('register validation', () => {
    it('warns on non-string values without schema/transform', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const { handler } = await setup()
      handler.register(reactive({ page: 1, active: true, ids: [1, 2] }), {})
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('non-string values'),
      )
      const msg = warn.mock.calls[0][0] as string
      expect(msg).toContain('"page" (number)')
      expect(msg).toContain('"active" (boolean)')
      expect(msg).toContain('"ids" (array)')
    })

    it('does not warn when a schema is provided', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const { handler } = await setup()
      handler.register(reactive({ page: 1 }), {
        schema: z.object({ page: z.coerce.number().default(1) }),
      })
      expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('non-string values'))
    })

    it('warns when the same data object is registered twice', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const { handler } = await setup()
      const data = reactive({ q: '' })
      handler.register(data, {})
      handler.register(data, {})
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('already registered'),
        expect.any(Object),
      )
    })
  })

  describe('reactive → URL', () => {
    it('writes changes to the URL via replace (default mode)', async () => {
      const { handler, router } = await setup()
      const replace = vi.spyOn(router, 'replace')
      const data = reactive({ q: '' })
      handler.register(data, {})
      handler.setEnabled(true, true)
      data.q = 'hello'
      await flushPromises()
      expect(router.currentRoute.value.query.q).toBe('hello')
      expect(replace).toHaveBeenCalled()
    })

    it('uses push when mode is "push"', async () => {
      const { handler, router } = await setup({ mode: 'push' })
      const push = vi.spyOn(router, 'push')
      const data = reactive({ q: '' })
      handler.register(data, {})
      handler.setEnabled(true, true)
      data.q = 'pushed'
      await flushPromises()
      expect(push).toHaveBeenCalled()
      expect(router.currentRoute.value.query.q).toBe('pushed')
    })

    it('does not touch the URL while disabled', async () => {
      const { handler, router } = await setup()
      const replace = vi.spyOn(router, 'replace')
      const data = reactive({ q: '' })
      handler.register(data, {})
      data.q = 'ignored'
      await flushPromises()
      expect(replace).not.toHaveBeenCalled()
      expect(router.currentRoute.value.query.q).toBeUndefined()
    })

    it('coerces typed values to the URL via schema', async () => {
      const { handler, router } = await setup()
      const data = reactive({ page: 1 })
      handler.register(data, {
        key: 'f',
        schema: z.object({ page: z.coerce.number().default(1) }),
      })
      handler.setEnabled(true, true)
      data.page = 4
      await flushPromises()
      expect(router.currentRoute.value.query['f[page]']).toBe('4')
    })
  })

  describe('URL → reactive', () => {
    it('hydrates registered data from the initial query on enable', async () => {
      const { handler } = await setup(undefined, { q: 'fromurl' })
      const data = reactive({ q: '' })
      handler.register(data, {})
      handler.setEnabled(true, true)
      await flushPromises()
      expect(data.q).toBe('fromurl')
    })

    it('updates reactive data after a route change (afterEach)', async () => {
      const { handler, router } = await setup()
      const data = reactive({ q: '' })
      handler.register(data, {})
      handler.setEnabled(true, true)
      await flushPromises()
      await router.push({ path: '/', query: { q: 'navigated' } })
      await flushPromises()
      expect(data.q).toBe('navigated')
    })

    it('coerces query strings to typed values via schema on navigation', async () => {
      const { handler, router } = await setup()
      const data = reactive({ page: 1 })
      handler.register(data, {
        key: 'f',
        schema: z.object({ page: z.coerce.number().default(1) }),
      })
      handler.setEnabled(true, true)
      await flushPromises()
      await router.push({ path: '/', query: { 'f[page]': '9' } })
      await flushPromises()
      expect(data.page).toBe(9)
    })
  })

  describe('handle behaviour', () => {
    it('wasChanged reflects mutations', async () => {
      const { handler } = await setup()
      const data = reactive({ q: '' })
      const handle = handler.register(data, {})
      expect(handle.wasChanged.value).toBe(false)
      data.q = 'x'
      expect(handle.wasChanged.value).toBe(true)
    })

    it('reset restores the initial data', async () => {
      const { handler } = await setup()
      const data = reactive({ q: 'start' })
      const handle = handler.register(data, {})
      data.q = 'changed'
      handle.reset()
      expect(data.q).toBe('start')
    })

    it('stop unregisters so later mutations no longer touch the URL', async () => {
      const { handler, router } = await setup()
      const data = reactive({ q: '' })
      const handle = handler.register(data, {})
      handler.setEnabled(true, true)
      await flushPromises()
      handle.stop()
      const replace = vi.spyOn(router, 'replace')
      data.q = 'after-stop'
      await flushPromises()
      expect(replace).not.toHaveBeenCalled()
    })
  })

  describe('getInjectionKey', () => {
    it('returns the query handler symbol', async () => {
      const { handler } = await setup()
      expect(handler.getInjectionKey()).toBe(contextStorageQueryHandler)
    })
  })

  describe('setEnabled edge cases', () => {
    it('does nothing when called before any registration (hasAnyRegistered = false)', async () => {
      const { handler, router } = await setup()
      const replace = vi.spyOn(router, 'replace')
      handler.setEnabled(true, true)
      await flushPromises()
      expect(replace).not.toHaveBeenCalled()
    })

    it('forces syncRegisteredToQuery when initial=false regardless of state change', async () => {
      const { handler, router } = await setup()
      const data = reactive({ q: 'hello' })
      handler.register(data, {})
      handler.setEnabled(true, true)
      await flushPromises()
      // Change data without flushing so the watcher microtask hasn't run yet
      data.q = 'world'
      const replace = vi.spyOn(router, 'replace')
      // initial=false forces syncRegisteredToQuery via the !initial branch
      handler.setEnabled(true, false)
      await flushPromises()
      expect(replace).toHaveBeenCalled()
      expect(router.currentRoute.value.query.q).toBe('world')
    })

    it('does not call syncRegisteredToQuery on second setEnabled(true, true) when already enabled', async () => {
      const { handler, router } = await setup()
      const data = reactive({ q: 'hello' })
      handler.register(data, {})
      handler.setEnabled(true, true)
      await flushPromises()
      const replace = vi.spyOn(router, 'replace')
      handler.setEnabled(true, true)
      await flushPromises()
      expect(replace).not.toHaveBeenCalled()
    })
  })

  describe('syncRegisteredToQuery edge cases', () => {
    it('skips URL update when the query is already equal', async () => {
      const { handler, router } = await setup()
      const data = reactive({ q: 'hello' })
      handler.register(data, {})
      handler.setEnabled(true, true)
      await flushPromises()
      const replace = vi.spyOn(router, 'replace')
      handler.setEnabled(true, false)
      await flushPromises()
      expect(replace).not.toHaveBeenCalled()
    })

    it('catches and logs errors thrown by the router', async () => {
      const { handler, router } = await setup()
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.spyOn(router, 'replace').mockRejectedValue(new Error('navigation failed'))
      const data = reactive({ q: '' })
      handler.register(data, {})
      handler.setEnabled(true, true)
      data.q = 'boom'
      await flushPromises()
      expect(errSpy).toHaveBeenCalledWith(
        expect.stringContaining('Got error while routing'),
        expect.any(Error),
      )
    })
  })

  describe('scheduleSyncToQuery edge cases', () => {
    it('deduplicates rapid data changes into a single URL update', async () => {
      const { handler, router } = await setup()
      const data = reactive({ q: '', page: '1' })
      handler.register(data, {})
      handler.setEnabled(true, true)
      await flushPromises()
      const replace = vi.spyOn(router, 'replace')
      data.q = 'test'
      data.page = '2'
      await flushPromises()
      expect(replace).toHaveBeenCalledTimes(1)
    })

    it('skips scheduled sync when the item is stopped before the microtask runs', async () => {
      const { handler, router } = await setup()
      const data = reactive({ q: '' })
      const handle = handler.register(data, {})
      handler.setEnabled(true, true)
      await flushPromises()
      const replace = vi.spyOn(router, 'replace')
      data.q = 'will-be-cancelled'
      // Let Vue's scheduler flush so the watcher fires and scheduleSyncToQuery
      // queues its queueMicrotask — but before that microtask runs:
      await Promise.resolve()
      // stop() increments registeredVersion so the pending queueMicrotask
      // sees a stale version and skips the sync
      handle.stop()
      await flushPromises()
      expect(replace).not.toHaveBeenCalled()
    })
  })

  describe('afterEachRoute edge cases', () => {
    it('does not update reactive data after navigation when handler is disabled', async () => {
      const { handler, router } = await setup()
      const data = reactive({ q: '' })
      handler.register(data, {})
      await router.push({ path: '/', query: { q: 'from-url' } })
      await flushPromises()
      expect(data.q).toBe('')
    })

    it('skips syncRegisteredToQuery when called while afterEachRoute flag is active', async () => {
      const { handler, router } = await setup()
      const data = reactive({ q: '' })
      handler.register(data, {})
      handler.setEnabled(true, true)
      await flushPromises()

      // Register a second afterEach that fires AFTER the handler's own afterEach.
      // At that point the flag is set but the clearing microtask hasn't run yet,
      // so calling setEnabled(true, false) drives syncRegisteredToQuery into the
      // preventSyncRegisteredToQueryByAfterEachRoute early-return branch.
      router.afterEach(() => {
        handler.setEnabled(true, false)
      })

      await router.push({ path: '/', query: { q: 'nav' } })
      await flushPromises()

      // Navigation still succeeds — only the redundant sync was skipped.
      expect(data.q).toBe('nav')
    })
  })

  describe('component lifecycle', () => {
    it('stops the afterEach listener when the component unmounts', async () => {
      const { handler, router, unmount } = await setup()
      const data = reactive({ q: '' })
      handler.register(data, {})
      handler.setEnabled(true, true)
      await flushPromises()
      unmount()
      // After unmount the afterEach listener is removed; navigating should not update data.
      await router.push({ path: '/', query: { q: 'post-unmount' } })
      await flushPromises()
      expect(data.q).toBe('')
    })
  })

  describe('syncInitialStateToRegisteredItem edge cases', () => {
    it('does nothing when URL has no keys for a keyed item (result.type === none)', async () => {
      const { handler } = await setup(undefined, { unrelated: 'value' })
      const data = reactive({ page: 1, search: '' })
      handler.register(data, {
        key: 'filters',
        schema: z.object({
          page: z.coerce.number().default(1),
          search: z.string().default(''),
        }),
      })
      handler.setEnabled(true, true)
      await flushPromises()
      expect(data.page).toBe(1)
      expect(data.search).toBe('')
    })

    it('resets data to initialData when URL is empty (result.type === reset)', async () => {
      const { handler, router } = await setup()
      const data = reactive({ q: 'initial' })
      handler.register(data, {})
      handler.setEnabled(true, true)
      await flushPromises()
      data.q = 'changed'
      await flushPromises()
      await router.push({ path: '/', query: {} })
      await flushPromises()
      expect(data.q).toBe('initial')
    })

    it('skips syncReactive when transformed data matches current state', async () => {
      const { handler, router } = await setup(undefined, { q: 'hello' })
      const data = reactive({ q: 'hello' })
      handler.register(data, {})
      handler.setEnabled(true, true)
      await flushPromises()
      const originalQ = data.q
      await router.push({ path: '/', query: { q: 'hello' } })
      await flushPromises()
      expect(data.q).toBe(originalQ)
    })

    it('preserves non-URL keys from itemState when URL only carries a subset of keys', async () => {
      // URL has only 'q'; item also has 'extra'. The sync should keep extra intact.
      const { handler, router } = await setup(undefined, { q: 'hello' })
      const data = reactive({ q: '', extra: 'preserved' })
      handler.register(data, {
        transform: (deserialized) => ({
          q: String(deserialized.q ?? ''),
          extra: 'preserved',
        }),
      })
      handler.setEnabled(true, true)
      await flushPromises()
      await router.push({ path: '/', query: { q: 'world' } })
      await flushPromises()
      expect(data.q).toBe('world')
      expect(data.extra).toBe('preserved')
    })
  })

  describe('register edge cases', () => {
    it('uses setTimeout for syncCallback during active router navigation (HMR path)', async () => {
      const { handler, router } = await setup()
      vi.spyOn(router, 'replace').mockReturnValue(new Promise(() => {}))
      const data1 = reactive({ q: '' })
      handler.register(data1, {})
      handler.setEnabled(true, true)
      data1.q = 'trigger'
      await flushPromises()
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout')
      const data2 = reactive({ x: '' })
      handler.register(data2, {})
      expect(setTimeoutSpy).toHaveBeenCalled()
    })

    it('applies additionalDefaultData baseline when provided', async () => {
      const { handler, router } = await setup()
      const data = reactive({ q: 'extra' })
      handler.register(data, { additionalDefaultData: { q: 'extra' } })
      handler.setEnabled(true, true)
      await flushPromises()
      expect(router.currentRoute.value.query.q).toBeUndefined()
    })

    it('serializes schema meta additionalDefaultData into a separate baseline', async () => {
      const { handler, router } = await setup()
      const schema = z.object({
        page: z.coerce.number().default(1).meta({ additionalDefaultData: 3 }),
      })
      const data = reactive({ page: 3 })
      handler.register(data, { schema })
      handler.setEnabled(true, true)
      await flushPromises()
      // page=3 matches schema meta additionalDefaultData → treated as default → omitted from URL
      expect(router.currentRoute.value.query.page).toBeUndefined()
    })

    it('stop() is idempotent and does not throw when called twice', async () => {
      const { handler } = await setup()
      const data = reactive({ q: '' })
      const handle = handler.register(data, {})
      handler.setEnabled(true, true)
      await flushPromises()
      handle.stop()
      expect(() => handle.stop()).not.toThrow()
    })
  })
})
