import type { ContextStorageHandlerConstructor } from '../../handlers'
import { deserializeParams, serializeParams } from './helpers'
import { contextStorageQueryHandler } from '../../symbols'
import { cloneDeep, isEqual, merge, pick } from 'lodash'
import { buildQuery } from './build-query'
import { computeSyncState } from './compute-sync-state'
import {
  getCurrentInstance,
  inject,
  type MaybeRefOrGetter,
  onBeforeUnmount,
  toValue,
  watch,
} from 'vue'
import { type LocationQuery, useRoute, useRouter } from 'vue-router'
import type {
  ContextStorageQueryRegisteredItem,
  IContextStorageQueryHandler,
  QueryHandlerBaseOptions,
  RegisterQueryHandlerBaseOptions,
  RegisterQueryHandlerOptions,
} from './types'

export function useContextStorageQueryHandler<T extends Record<string, unknown>>(
  data: MaybeRefOrGetter<T>,
  options?: RegisterQueryHandlerBaseOptions<T>,
): void {
  const handler = inject<InstanceType<typeof ContextStorageQueryHandler>>(
    contextStorageQueryHandler,
  )

  if (!handler) {
    throw new Error('[vue-context-storage] ContextStorageQueryHandler is not provided')
  }

  const currentInstance = getCurrentInstance()
  const uid = currentInstance?.uid || 0

  const causer = new Error().stack?.split('\n')[2]?.trimStart() || 'unknown'

  const stop = handler.register(data, { causer, uid, ...options })
  onBeforeUnmount(() => {
    stop()
  })
}

export interface ApplyTransformInput<T extends Record<string, unknown>> {
  state: Record<string, unknown>
  initialData: T
  schema?: {
    safeParse: (data: unknown) => { success: true; data: any } | { success: false; error: any }
  }
  transform?: (deserialized: any, initialData: T) => any
  mergeOnlyExistingKeysWithoutTransform: boolean
}

export interface ApplyTransformWarning {
  message: string
  args: unknown[]
}

export interface ApplyTransformResult {
  data: Record<string, unknown>
  warnings: ApplyTransformWarning[]
}

export function applyTransform<T extends Record<string, unknown>>(
  input: ApplyTransformInput<T>,
): ApplyTransformResult {
  const warnings: ApplyTransformWarning[] = []
  let data: Record<string, unknown> = input.state

  // Priority: schema > transform > default merge
  if (input.schema) {
    const result = input.schema.safeParse(data)

    if (result.success) {
      data = result.data
    } else {
      warnings.push({ message: '[vue-context-storage] schema parse failed', args: [result.error] })
    }

    if (input.transform) {
      warnings.push({
        message: '[vue-context-storage] transform is not supported with schema',
        args: [],
      })
    }
  } else if (input.transform) {
    data = input.transform(data as any, input.initialData)
  } else {
    if (input.mergeOnlyExistingKeysWithoutTransform) {
      data = pick(data, Object.keys(input.initialData))
    }
  }

  return { data, warnings }
}

export class ContextStorageQueryHandler<
  T extends Record<string, unknown>,
> implements IContextStorageQueryHandler<T> {
  private enabled = false
  private registered: ContextStorageQueryRegisteredItem<any>[] = []
  private currentQuery: LocationQuery | undefined = undefined
  private readonly route: ReturnType<typeof useRoute>
  private router: ReturnType<typeof useRouter>
  private initialState?: Record<string, unknown>
  private hasAnyRegistered = false
  private preventSyncRegisteredToQueryByAfterEachRoute = false
  private preventAfterEachRouteCallsWhileCallingRouter = false

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

    if (this.hasAnyRegistered) {
      if (initial) {
        this.syncInitialStateToRegistered()
      }

      if ((state && !prevState) || !initial) {
        this.syncRegisteredToQuery()
      }
    }
  }

  async syncRegisteredToQuery(): Promise<void> {
    if (!this.enabled) {
      return
    }

    if (this.preventSyncRegisteredToQueryByAfterEachRoute) {
      return
    }

    const { newQuery, newQueryRaw } = this.#buildQueryFromRegistered()

    this.currentQuery = newQueryRaw

    if (isEqual(newQuery, this.route.query)) {
      return
    }

    this.preventAfterEachRouteCallsWhileCallingRouter = true
    try {
      if (this.options.mode === 'replace') {
        await this.router.replace({ ...this.route, query: newQuery })
      } else {
        await this.router.push({ ...this.route, query: newQuery })
      }
    } catch (e) {
      console.error('[vue-context-storage] Got error while routing', e)
    }
    this.preventAfterEachRouteCallsWhileCallingRouter = false
  }

  afterEachRoute(): void {
    if (!this.enabled) {
      return
    }

    if (this.preventAfterEachRouteCallsWhileCallingRouter) {
      return
    }

    this.setInitialState(this.route.query)

    this.preventSyncRegisteredToQueryByAfterEachRoute = true
    queueMicrotask(() => {
      this.preventSyncRegisteredToQueryByAfterEachRoute = false

      this.syncInitialStateToRegistered()
      this.syncRegisteredToQuery()
    })

    setTimeout(() => {
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
    if (this.initialState === undefined) {
      return
    }

    const {
      prefix,
      mergeOnlyExistingKeysWithoutTransform = this.options.mergeOnlyExistingKeysWithoutTransform,
      onlyChanges = this.options.onlyChanges,
    } = item.options || {}

    const itemState = toValue(item.data)

    const result = computeSyncState({
      deserializedState: deserializeParams(this.initialState),
      itemState,
      initialData: item.initialData,
      prefix,
      onlyChanges,
      emptyPlaceholder: this.options.emptyPlaceholder,
    })

    if (result.type === 'none') {
      return
    }

    if (result.type === 'reset') {
      merge(itemState, result.data)
      return
    }

    // result.type === 'sync'
    const transformed = applyTransform({
      state: result.data,
      initialData: item.initialData,
      schema: item.options?.schema,
      transform: item.options?.transform,
      mergeOnlyExistingKeysWithoutTransform,
    })

    transformed.warnings.forEach((w) => console.warn(w.message, ...w.args))

    if (isEqual(itemState, transformed.data)) {
      return
    }

    merge(itemState, transformed.data)
  }

  register<T extends Record<string, unknown>>(
    data: MaybeRefOrGetter<T>,
    options: RegisterQueryHandlerOptions<T>,
  ): () => void {
    this.hasAnyRegistered = true

    const watchHandle = watch(data, () => this.syncRegisteredToQuery(), {
      deep: true,
    })

    const initialData = cloneDeep(toValue(data)) as T
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
      this.syncInitialStateToRegisteredItem(item)
      this.syncRegisteredToQuery()
    }

    if (this.preventAfterEachRouteCallsWhileCallingRouter) {
      /**
       * Macrotask solves syncing issues when syncRegisteredToQuery called after HMR
       */
      setTimeout(syncCallback)
    } else {
      queueMicrotask(syncCallback)
    }

    return (): void => {
      this.registered.splice(this.registered.indexOf(item), 1)
      this.syncRegisteredToQuery()
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
