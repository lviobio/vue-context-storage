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
})
