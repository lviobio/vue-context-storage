import type { ContextStorageHandler, ContextStorageHandlerConstructor } from '../../handlers'
import { deserializeParams, serializeParams } from './helpers'
import { contextStorageQueryHandler } from '../../symbols'
import { cloneDeep, isEqual } from 'lodash'
import { applyTransform, syncReactive } from '../helpers'
import { buildQuery } from './build-query'
import { computeSyncState } from './compute-sync-state'
import { computed, inject, type MaybeRefOrGetter, onBeforeUnmount, toValue, watch } from 'vue'
import { type LocationQuery, useRoute, useRouter } from 'vue-router'
import type {
  ContextStorageQueryRegisteredItem,
  QueryHandlerBaseOptions,
  RegisterQueryHandlerOptions,
} from './types'
import { buildContextStorageHandler } from '../helpers'
import type { UseContextStorageResult } from '../../composables/types'

export function useContextStorageQueryHandler<T extends Record<string, unknown>>(
  data: MaybeRefOrGetter<T>,
  options?: RegisterQueryHandlerOptions<T>,
): UseContextStorageResult<T> {
  const handler = inject<InstanceType<typeof ContextStorageQueryHandler<T>>>(
    contextStorageQueryHandler,
  )

  if (!handler) {
    throw new Error('[vue-context-storage] ContextStorageQueryHandler is not provided')
  }

  return buildContextStorageHandler(handler, data, options)
}

export class ContextStorageQueryHandler<
  T extends Record<string, unknown>,
> implements ContextStorageHandler<T, RegisterQueryHandlerOptions<T>> {
  private enabled = false
  private registered: ContextStorageQueryRegisteredItem<any>[] = []
  private registeredDataObjects = new Set<object>()
  private currentQuery: LocationQuery | undefined = undefined
  private readonly route: ReturnType<typeof useRoute>
  private router: ReturnType<typeof useRouter>
  private initialState?: Record<string, unknown>
  private hasAnyRegistered = false
  private preventSyncRegisteredToQueryByAfterEachRoute = false
  private preventAfterEachRouteCallsWhileCallingRouter = 0
  private syncToQueryScheduled = false
  private registeredVersion = 0

  static customQueryHandlerOptions: QueryHandlerBaseOptions = {}

  private readonly options: Required<QueryHandlerBaseOptions> = {
    mode: 'replace',
    emptyPlaceholder: '_',
    mergeOnlyExistingKeysWithoutTransform: true,
    preserveUnusedKeys: false,
    preserveEmptyState: false,
    onlyChanges: true,
  }

  // noinspection JSUnusedGlobalSymbols
  static configure<T extends Record<string, unknown>>(
    options: QueryHandlerBaseOptions,
  ): ContextStorageHandlerConstructor<T> {
    ContextStorageQueryHandler.customQueryHandlerOptions = options

    return ContextStorageQueryHandler<T>
  }

  constructor() {
    this.route = useRoute()
    this.router = useRouter()

    this.options = {
      ...this.options,
      ...ContextStorageQueryHandler.customQueryHandlerOptions,
    }

    const stopAfterEach = this.router.afterEach(() => {
      this.afterEachRoute()
    })

    onBeforeUnmount(() => {
      stopAfterEach()
    })
  }

  getInjectionKey(): typeof contextStorageQueryHandler {
    return contextStorageQueryHandler
  }

  setInitialState(state: Record<string, unknown> | undefined): void {
    this.initialState = state
  }

  static getInitialStateResolver(): () => LocationQuery {
    const route = useRoute()

    return () => route.query
  }

  setEnabled(state: boolean, initial: boolean): void {
    const prevState = this.enabled
    this.enabled = state
    console.debug('[query-handler] setEnabled', {
      state,
      prevState,
      initial,
      hasAnyRegistered: this.hasAnyRegistered,
    })

    if (this.hasAnyRegistered) {
      if (initial) {
        console.debug(
          '[query-handler] setEnabled → syncInitialStateToRegistered',
          this.initialState,
        )
        this.syncInitialStateToRegistered()
      }

      if ((state && !prevState) || !initial) {
        console.debug('[query-handler] setEnabled → syncRegisteredToQuery')
        this.syncRegisteredToQuery()
      }
    }
  }

  async syncRegisteredToQuery(): Promise<void> {
    if (!this.enabled) {
      console.debug('[query-handler] syncRegisteredToQuery — skipped (disabled)')
      return
    }

    if (this.preventSyncRegisteredToQueryByAfterEachRoute) {
      console.debug(
        '[query-handler] syncRegisteredToQuery — skipped (preventSyncRegisteredToQueryByAfterEachRoute)',
      )
      return
    }

    const { newQuery, newQueryRaw } = this.#buildQueryFromRegistered()

    this.currentQuery = newQueryRaw

    if (isEqual(newQuery, this.route.query)) {
      console.debug('[query-handler] syncRegisteredToQuery — skipped (query unchanged)')
      return
    }

    console.debug('[query-handler] syncRegisteredToQuery — updating URL', {
      mode: this.options.mode,
      newQuery,
    })
    this.preventAfterEachRouteCallsWhileCallingRouter++
    try {
      if (this.options.mode === 'replace') {
        await this.router.replace({ ...this.route, query: newQuery })
      } else {
        await this.router.push({ ...this.route, query: newQuery })
      }
    } catch (e) {
      console.error('[vue-context-storage] Got error while routing', e)
    } finally {
      this.preventAfterEachRouteCallsWhileCallingRouter--
    }
  }

  private scheduleSyncToQuery(): void {
    if (this.syncToQueryScheduled) {
      console.debug('[query-handler] scheduleSyncToQuery — deduplicated (already scheduled)')
      return
    }
    console.debug('[query-handler] scheduleSyncToQuery — scheduled microtask')
    this.syncToQueryScheduled = true
    const version = this.registeredVersion
    queueMicrotask(() => {
      this.syncToQueryScheduled = false
      if (version !== this.registeredVersion) {
        console.debug('[query-handler] scheduleSyncToQuery — skipped (stale, version changed)')
        return
      }
      console.debug('[query-handler] scheduleSyncToQuery — executing microtask')
      this.syncRegisteredToQuery()
    })
  }

  afterEachRoute(): void {
    if (!this.enabled) {
      console.debug('[query-handler] afterEachRoute — skipped (disabled)')
      return
    }

    if (this.preventAfterEachRouteCallsWhileCallingRouter) {
      console.debug(
        '[query-handler] afterEachRoute — skipped (preventAfterEachRouteCallsWhileCallingRouter)',
      )
      return
    }

    console.debug(
      '[query-handler] afterEachRoute — setting initial state from route query',
      this.route.query,
    )
    this.setInitialState(this.route.query)

    this.preventSyncRegisteredToQueryByAfterEachRoute = true
    queueMicrotask(() => {
      console.debug(
        '[query-handler] afterEachRoute microtask — syncInitialStateToRegistered + syncRegisteredToQuery',
        this.initialState,
      )
      this.preventSyncRegisteredToQueryByAfterEachRoute = false

      this.syncInitialStateToRegistered()
      this.syncRegisteredToQuery()
    })
  }

  syncInitialStateToRegistered(): void {
    this.registered.forEach((item) => this.syncInitialStateToRegisteredItem(item))
  }

  syncInitialStateToRegisteredItem<T extends Record<string, unknown>>(
    item: ContextStorageQueryRegisteredItem<T>,
  ): void {
    const prefix = item.options?.prefix

    if (this.initialState === undefined) {
      console.debug(
        '[query-handler] syncInitialStateToRegisteredItem — skipped (no initial state)',
        {
          prefix,
        },
      )
      return
    }

    const {
      mergeOnlyExistingKeysWithoutTransform = this.options.mergeOnlyExistingKeysWithoutTransform,
    } = item.options || {}

    const itemState = toValue(item.data)

    const result = computeSyncState({
      deserializedState: deserializeParams(this.initialState),
      initialData: item.initialData,
      prefix,
      emptyPlaceholder: this.options.emptyPlaceholder,
    })

    if (result.type === 'none') {
      console.debug('[query-handler] syncInitialStateToRegisteredItem — no changes', { prefix })
      return
    }

    if (result.type === 'reset') {
      console.debug('[query-handler] syncInitialStateToRegisteredItem — reset', {
        prefix,
        data: result.data,
      })
      syncReactive(itemState, result.data)
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
        { prefix },
      )
      return
    }

    console.debug('[query-handler] syncInitialStateToRegisteredItem — merging', {
      prefix,
      from: { ...itemState },
      to: finalData,
    })
    syncReactive(itemState, finalData)
  }

  register<T extends Record<string, unknown>>(
    data: MaybeRefOrGetter<T>,
    options: RegisterQueryHandlerOptions<T>,
  ) {
    const resolvedData = toValue(data)
    if (this.registeredDataObjects.has(resolvedData)) {
      console.warn(
        '[vue-context-storage] The same data object is already registered in ContextStorageQueryHandler.',
        { prefix: options?.prefix },
      )
    }
    this.registeredDataObjects.add(resolvedData)

    this.hasAnyRegistered = true

    const watchHandle = watch(
      data,
      () => {
        console.debug('[query-handler] watcher triggered', { prefix: options.prefix })
        this.scheduleSyncToQuery()
      },
      {
        deep: true,
      },
    )

    const initialData = cloneDeep(resolvedData) as T
    const initialQueryData = serializeParams(initialData, { prefix: options.prefix })

    const item: ContextStorageQueryRegisteredItem<T> = {
      data,
      initialData,
      initialQueryData,
      options,
      watchHandle,
    }
    this.registered.push(item)

    const syncCallback = (): void => {
      console.debug('[query-handler] register syncCallback executing', { prefix: options.prefix })
      this.syncInitialStateToRegisteredItem(item)
      this.scheduleSyncToQuery()
    }

    if (this.preventAfterEachRouteCallsWhileCallingRouter) {
      console.debug(
        '[query-handler] register — scheduling syncCallback via setTimeout (HMR path)',
        {
          prefix: options.prefix,
        },
      )
      /**
       * Macrotask solves syncing issues when syncRegisteredToQuery called after HMR
       */
      setTimeout(syncCallback)
    } else {
      console.debug('[query-handler] register — scheduling syncCallback via microtask', {
        prefix: options.prefix,
      })
      queueMicrotask(syncCallback)
    }

    const wasChanged = computed(() => !isEqual(toValue(data), initialData))

    return {
      stop: () => {
        console.debug('[query-handler] unregister', { prefix: options.prefix })
        item.watchHandle.stop()
        const index = this.registered.indexOf(item)
        if (index !== -1) {
          this.registered.splice(index, 1)
        }
        this.registeredDataObjects.delete(resolvedData)
        this.registeredVersion++
        this.syncRegisteredToQuery()
      },
      reset: () => {
        console.debug('[query-handler] reset', { prefix: options.prefix })
        syncReactive(toValue(data) as Record<string, unknown>, cloneDeep(initialData))
      },
      wasChanged,
    }
  }

  #buildQueryFromRegistered(): { newQuery: LocationQuery; newQueryRaw: LocationQuery } {
    const result = buildQuery({
      items: this.registered.map((item) => ({
        data: toValue(item.data) as Record<string, unknown>,
        initialQueryData: item.initialQueryData,
        prefix: item.options?.prefix,
        onlyChanges: item.options?.onlyChanges,
        preserveEmptyState: item.options?.preserveEmptyState,
        causer: item.options?.causer,
      })),
      currentQuery: this.currentQuery,
      routeQuery: this.route.query,
      preserveUnusedKeys: this.options.preserveUnusedKeys,
      preserveEmptyState: this.options.preserveEmptyState,
      onlyChanges: this.options.onlyChanges,
      emptyPlaceholder: this.options.emptyPlaceholder,
    })

    result.warnings.forEach((w) => console.warn(w))

    return { newQuery: result.newQuery, newQueryRaw: result.newQueryRaw }
  }
}
