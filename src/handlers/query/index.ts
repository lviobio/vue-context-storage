import type { ContextStorageHandlerFactory } from '../../handlers'
import { deserializeParams, serializeParams } from './helpers'
import { contextStorageQueryHandler } from '../../symbols'
import { cloneDeep, isEqual } from 'lodash'
import { applyTransform, syncReactive } from '../helpers'
import { buildQuery } from './build-query'
import { computeSyncState } from './compute-sync-state'
import { computed, type MaybeRefOrGetter, onBeforeUnmount, toValue, watch } from 'vue'
import { type LocationQuery, useRoute, useRouter } from 'vue-router'
import type {
  ContextStorageQueryRegisteredItem,
  QueryHandlerBaseOptions,
  RegisterQueryHandlerOptions,
} from './types'

export function createQueryHandler(
  baseOptions?: QueryHandlerBaseOptions,
): ContextStorageHandlerFactory {
  const factory: ContextStorageHandlerFactory = () => {
    const route = useRoute()
    const router = useRouter()

    let enabled = false
    const registered: ContextStorageQueryRegisteredItem<any>[] = []
    const registeredDataObjects = new Set<object>()
    let currentQuery: LocationQuery | undefined = undefined
    let hasAnyRegistered = false
    let preventSyncRegisteredToQueryByAfterEachRoute = false
    let preventAfterEachRouteCallsWhileCallingRouter = 0
    let syncToQueryScheduled = false
    let registeredVersion = 0

    const options: Required<QueryHandlerBaseOptions> = {
      mode: 'replace',
      emptyPlaceholder: '_',
      mergeOnlyExistingKeysWithoutTransform: true,
      preserveUnusedKeys: true,
      preserveEmptyState: false,
      onlyChanges: true,
      ...baseOptions,
    }

    const stopAfterEach = router.afterEach(() => {
      afterEachRoute()
    })

    onBeforeUnmount(() => {
      stopAfterEach()
    })

    function getInjectionKey(): typeof contextStorageQueryHandler {
      return contextStorageQueryHandler
    }

    function setEnabled(state: boolean, initial: boolean): void {
      const prevState = enabled
      enabled = state
      console.debug('[query-handler] setEnabled', {
        state,
        prevState,
        initial,
        hasAnyRegistered,
      })

      if (hasAnyRegistered) {
        if (initial) {
          console.debug('[query-handler] setEnabled → syncInitialStateToRegistered', route.query)
          syncInitialStateToRegistered()
        }

        if ((state && !prevState) || !initial) {
          console.debug('[query-handler] setEnabled → syncRegisteredToQuery')
          syncRegisteredToQuery()
        }
      }
    }

    async function syncRegisteredToQuery(): Promise<void> {
      if (!enabled) {
        console.debug('[query-handler] syncRegisteredToQuery — skipped (disabled)')
        return
      }

      if (preventSyncRegisteredToQueryByAfterEachRoute) {
        console.debug(
          '[query-handler] syncRegisteredToQuery — skipped (preventSyncRegisteredToQueryByAfterEachRoute)',
        )
        return
      }

      const { newQuery, newQueryRaw } = buildQueryFromRegistered()

      currentQuery = newQueryRaw

      if (isEqual(newQuery, route.query)) {
        console.debug('[query-handler] syncRegisteredToQuery — skipped (query unchanged)')
        return
      }

      console.debug('[query-handler] syncRegisteredToQuery — updating URL', {
        mode: options.mode,
        newQuery,
      })
      preventAfterEachRouteCallsWhileCallingRouter++
      try {
        if (options.mode === 'replace') {
          await router.replace({ ...route, query: newQuery })
        } else {
          await router.push({ ...route, query: newQuery })
        }
      } catch (e) {
        console.error('[vue-context-storage] Got error while routing', e)
      } finally {
        preventAfterEachRouteCallsWhileCallingRouter--
      }
    }

    function scheduleSyncToQuery(): void {
      if (syncToQueryScheduled) {
        console.debug('[query-handler] scheduleSyncToQuery — deduplicated (already scheduled)')
        return
      }
      console.debug('[query-handler] scheduleSyncToQuery — scheduled microtask')
      syncToQueryScheduled = true
      const version = registeredVersion
      queueMicrotask(() => {
        syncToQueryScheduled = false
        if (version !== registeredVersion) {
          console.debug('[query-handler] scheduleSyncToQuery — skipped (stale, version changed)')
          return
        }
        console.debug('[query-handler] scheduleSyncToQuery — executing microtask')
        syncRegisteredToQuery()
      })
    }

    function afterEachRoute(): void {
      if (!enabled) {
        console.debug('[query-handler] afterEachRoute — skipped (disabled)')
        return
      }

      if (preventAfterEachRouteCallsWhileCallingRouter) {
        console.debug(
          '[query-handler] afterEachRoute — skipped (preventAfterEachRouteCallsWhileCallingRouter)',
        )
        return
      }

      console.debug('[query-handler] afterEachRoute — syncing from route query', route.query)

      preventSyncRegisteredToQueryByAfterEachRoute = true
      queueMicrotask(() => {
        console.debug(
          '[query-handler] afterEachRoute microtask — syncInitialStateToRegistered + syncRegisteredToQuery',
          route.query,
        )
        preventSyncRegisteredToQueryByAfterEachRoute = false

        syncInitialStateToRegistered()
        syncRegisteredToQuery()
      })
    }

    function syncInitialStateToRegistered(): void {
      registered.forEach((item) => syncInitialStateToRegisteredItem(item))
    }

    function syncInitialStateToRegisteredItem<T extends Record<string, unknown>>(
      item: ContextStorageQueryRegisteredItem<T>,
    ): void {
      const key = item.options?.key

      const {
        mergeOnlyExistingKeysWithoutTransform = options.mergeOnlyExistingKeysWithoutTransform,
      } = item.options || {}

      const itemState = toValue(item.data)

      const result = computeSyncState({
        deserializedState: deserializeParams(route.query),
        initialData: item.initialData,
        key,
        emptyPlaceholder: options.emptyPlaceholder,
      })

      if (result.type === 'none') {
        console.debug('[query-handler] syncInitialStateToRegisteredItem — no changes', { key })
        return
      }

      if (result.type === 'reset') {
        console.debug('[query-handler] syncInitialStateToRegisteredItem — reset', {
          key,
          data: result.data,
        })
        // Must cloneDeep to avoid sharing nested object references with initialData.
        // Without cloning, Object.assign makes itemState.nested === initialData.nested,
        // so subsequent mutations to itemState also corrupt initialData.
        syncReactive(itemState, cloneDeep(result.data))
        return
      }

      // result.type === 'sync'
      const urlKeys = new Set(Object.keys(result.data))

      const transformed = applyTransform({
        state: result.data,
        initialData: item.initialData,
        schema: item.options?.schema,
        transform: item.options?.transform,
        mergeOnlyExistingKeysWithoutTransform,
      })

      transformed.warnings.forEach((w) => console.warn(w.message, ...w.args))

      // For non-URL keys, preserve values from itemState instead of using transform fallbacks.
      // Transform functions are typed for URL-deserialized values (string/null/undefined),
      // not for already-typed values (boolean/number) that would come from itemState.
      const finalData: Record<string, unknown> = { ...transformed.data }
      for (const key of Object.keys(itemState as Record<string, unknown>)) {
        if (!urlKeys.has(key)) {
          finalData[key] = (itemState as Record<string, unknown>)[key]
        }
      }

      if (isEqual(itemState, finalData)) {
        console.debug(
          '[query-handler] syncInitialStateToRegisteredItem — skipped (data unchanged after transform)',
          { key },
        )
        return
      }

      console.debug('[query-handler] syncInitialStateToRegisteredItem — merging', {
        key,
        from: { ...itemState },
        to: finalData,
      })
      syncReactive(itemState, finalData)
    }

    function register<T extends Record<string, unknown>>(
      data: MaybeRefOrGetter<T>,
      registerOptions: RegisterQueryHandlerOptions<T>,
    ) {
      const resolvedData = toValue(data)
      if (registeredDataObjects.has(resolvedData)) {
        console.warn(
          '[vue-context-storage] The same data object is already registered in ContextStorageQueryHandler.',
          { key: registerOptions?.key },
        )
      }
      registeredDataObjects.add(resolvedData)

      if (!registerOptions.transform && !registerOptions.schema) {
        const problematicKeys: string[] = []
        for (const [key, value] of Object.entries(resolvedData)) {
          if (typeof value === 'number') {
            problematicKeys.push(`"${key}" (number)`)
          } else if (typeof value === 'boolean') {
            problematicKeys.push(`"${key}" (boolean)`)
          } else if (Array.isArray(value)) {
            problematicKeys.push(`"${key}" (array)`)
          }
        }
        if (problematicKeys.length > 0) {
          console.warn(
            `[vue-context-storage] Query handler registered with non-string values: ${problematicKeys.join(', ')}. ` +
              `URL query parameters are always strings, so these values will lose their types after restore. ` +
              `Use "schema" or "transform" option to ensure correct type coercion.`,
          )
        }
      }

      hasAnyRegistered = true

      const watchHandle = watch(
        data,
        () => {
          console.debug('[query-handler] watcher triggered', { key: registerOptions.key })
          scheduleSyncToQuery()
        },
        {
          deep: true,
        },
      )

      const initialData = cloneDeep(resolvedData) as T
      const initialQueryData = serializeParams(initialData, { key: registerOptions.key })
      const additionalDefaultQueryData = registerOptions.additionalDefaultData
        ? serializeParams(registerOptions.additionalDefaultData as Record<string, unknown>, {
            key: registerOptions.key,
          })
        : undefined

      const item: ContextStorageQueryRegisteredItem<T> = {
        data,
        initialData,
        initialQueryData,
        additionalDefaultQueryData,
        options: registerOptions,
        watchHandle,
      }
      registered.push(item)

      const syncCallback = (): void => {
        console.debug('[query-handler] register syncCallback executing', {
          key: registerOptions.key,
        })
        syncInitialStateToRegisteredItem(item)
        scheduleSyncToQuery()
      }

      if (preventAfterEachRouteCallsWhileCallingRouter) {
        console.debug(
          '[query-handler] register — scheduling syncCallback via setTimeout (HMR path)',
          {
            key: registerOptions.key,
          },
        )
        /**
         * Macrotask solves syncing issues when syncRegisteredToQuery called after HMR
         */
        setTimeout(syncCallback)
      } else {
        console.debug('[query-handler] register — scheduling syncCallback via microtask', {
          key: registerOptions.key,
        })
        syncCallback()
      }

      const wasChanged = computed(() => !isEqual(toValue(data), initialData))

      return {
        stop: () => {
          console.debug('[query-handler] unregister', { key: registerOptions.key })
          item.watchHandle.stop()
          const index = registered.indexOf(item)
          if (index !== -1) {
            registered.splice(index, 1)
          }
          registeredDataObjects.delete(resolvedData)
          registeredVersion++
          // Reset currentQuery so that subsequent syncs from remaining items
          // won't treat the unregistered item's keys as "owned" and delete them.
          currentQuery = undefined
        },
        reset: () => {
          console.debug('[query-handler] reset', { key: registerOptions.key })
          syncReactive(toValue(data) as Record<string, unknown>, cloneDeep(initialData))
        },
        wasChanged,
      }
    }

    function buildQueryFromRegistered(): { newQuery: LocationQuery; newQueryRaw: LocationQuery } {
      const result = buildQuery({
        items: registered.map((item) => ({
          data: toValue(item.data) as Record<string, unknown>,
          initialQueryData: item.initialQueryData,
          additionalDefaultQueryData: item.additionalDefaultQueryData,
          key: item.options?.key,
          onlyChanges: item.options?.onlyChanges,
          preserveEmptyState: item.options?.preserveEmptyState,
          causer: item.options?.causer,
        })),
        currentQuery,
        routeQuery: route.query,
        preserveUnusedKeys: options.preserveUnusedKeys,
        preserveEmptyState: options.preserveEmptyState,
        onlyChanges: options.onlyChanges,
        emptyPlaceholder: options.emptyPlaceholder,
      })

      result.warnings.forEach((w) => console.warn(w))

      return { newQuery: result.newQuery, newQueryRaw: result.newQueryRaw }
    }

    return { register, setEnabled, getInjectionKey }
  }

  return factory
}
