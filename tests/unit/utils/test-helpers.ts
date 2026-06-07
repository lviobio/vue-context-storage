import { createRouter, createMemoryHistory, type Router } from 'vue-router'
import type { Component } from 'vue'

/**
 * Creates a test router with minimal configuration
 */
export function createTestRouter(
  routes: Array<{ path: string; component?: Component }> = [],
): Router {
  const defaultRoutes =
    routes.length > 0
      ? routes
      : [
          {
            path: '/',
            component: { template: '<div>Home</div>' },
          },
          {
            path: '/test',
            component: { template: '<div>Test</div>' },
          },
        ]

  return createRouter({
    history: createMemoryHistory(),
    routes: defaultRoutes,
  })
}

/**
 * Waits for router to be ready and navigates to a path
 */
export async function setupRouter(router: Router, path: string = '/') {
  await router.push(path)
  await router.isReady()
  return router
}

/**
 * Creates a simple delay promise for testing async behavior
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Waits for next tick
 */
export function nextTick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

/**
 * Creates mock location query for testing
 */
export function createMockQuery(query: Record<string, string | string[]>) {
  return query
}

/**
 * Helper to create test data for query handler tests
 */
export function createTestFilters() {
  return {
    search: '',
    page: 1,
    status: 'active' as 'active' | 'inactive',
    tags: [] as string[],
  }
}

/**
 * Helper to wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean,
  options: { timeout?: number; interval?: number } = {},
): Promise<void> {
  const { timeout = 1000, interval = 50 } = options
  const startTime = Date.now()

  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('waitFor timeout exceeded')
    }
    await delay(interval)
  }
}

/**
 * Helper to create nested query parameters
 */
export function createNestedQuery(
  prefix: string,
  data: Record<string, any>,
): Record<string, string> {
  const result: Record<string, string> = {}

  Object.entries(data).forEach(([key, value]) => {
    const queryKey = `${prefix}[${key}]`
    if (typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, createNestedQuery(queryKey, value))
    } else if (Array.isArray(value)) {
      result[queryKey] = value.join(',')
    } else {
      result[queryKey] = String(value)
    }
  })

  return result
}
