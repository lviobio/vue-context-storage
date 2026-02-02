import type { ContextStorageHandlerConstructor } from '../../handlers'
import { deserializeParams, serializeParams } from './helpers'
import { contextStorageQueryHandler } from '../../symbols'
import { cloneDeep, isEqual, merge, omit, pick } from 'lodash'
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

function sortQueryByReference(query: LocationQuery, ...references: LocationQuery[]): LocationQuery {
  const sorted: LocationQuery = {}

  const referenceKeys = new Set<string>()

  references.forEach((reference) => {
    Object.keys(reference).forEach((key) => {
      referenceKeys.add(key)
    })
  })

  referenceKeys.forEach((key) => {
    if (key in query && !(key in sorted)) {
      sorted[key] = query[key]
    }
  })

  Object.keys(query).forEach((key) => {
    if (!(key in sorted)) {
      sorted[key] = query[key]
    }
  })

  return sorted
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

  syncInitialStateToRegisteredItem<T extends Record<string, unknown>>(
    item: ContextStorageQueryRegisteredItem<T>,
  ): void {
    if (this.initialState === undefined) {
      return
    }

    let initialState: Record<string, unknown> | undefined | null = deserializeParams(
      this.initialState,
    )

    const {
      prefix,
      mergeOnlyExistingKeysWithoutTransform = this.options.mergeOnlyExistingKeysWithoutTransform,
      onlyChanges = this.options.onlyChanges,
    } = item.options || {}

    if (typeof prefix === 'string' && prefix.length > 0) {
      initialState = initialState[prefix] as Record<string, unknown> | undefined | null
    }

    if (initialState === undefined) {
      return
    }

    /**
     * null can be if query parameter only has a name without a value sign (e.g. /?name)
     */
    if (initialState === null) {
      return
    }

    /**
     * Current state of the item
     */
    const itemState = toValue(item.data)

    /**
     * Initial state keys before any manipulation
     */
    const initialStateBaseKeys = initialState ? Object.keys(initialState) : []

    let wasEmptyState = false

    /**
     * If the data is empty, return the initial value.
     *
     * This can happen when directly navigating to a route, for example through a menu item.
     */
    if (!initialStateBaseKeys.length) {
      merge(itemState, item.initialData)
      return
    }

    if (initialStateBaseKeys.length === 1 && initialState[this.options.emptyPlaceholder] === null) {
      delete initialState[this.options.emptyPlaceholder]
      wasEmptyState = true
    }

    if (onlyChanges && !wasEmptyState) {
      merge(initialState, omit(itemState, initialStateBaseKeys))
    }

    // Priority: schema > transform > default merge
    if (item.options?.schema) {
      // Use Zod schema for validation and transformation
      const result = item.options.schema.safeParse(initialState)

      if (result.success) {
        initialState = result.data
      } else {
        console.warn('[vue-context-storage] schema parse failed', result.error)
      }

      if (item.options?.transform) {
        console.warn('[vue-context-storage] transform is not supported with schema')
      }
    } else if (item.options?.transform) {
      initialState = item.options.transform(initialState as any, item.initialData)
    } else {
      if (mergeOnlyExistingKeysWithoutTransform) {
        initialState = pick(initialState, Object.keys(item.initialData))
      }
    }

    if (isEqual(itemState, initialState)) {
      return
    }

    merge(itemState, initialState)
  }

  syncInitialStateToRegistered(): void {
    this.registered.forEach((item) => this.syncInitialStateToRegisteredItem(item))
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
    const newQueryRaw: LocationQuery = {}

    this.registered.forEach((item) => {
      const options = item.options || {}
      const { prefix, onlyChanges = this.options.onlyChanges } = options
      let { preserveEmptyState = this.options.preserveEmptyState } = options
      const patch = serializeParams(toValue(item.data), {
        prefix,
      })

      // Remove keys that have the same value as initial
      if (onlyChanges) {
        if (preserveEmptyState) {
          preserveEmptyState = false
          console.warn('[vue-context-storage] preserveEmptyState is not supported with onlyChanges')
        }

        Object.keys(patch).forEach((key) => {
          if (isEqual(patch[key], item.initialQueryData[key])) {
            delete patch[key]
          }
        })
      }

      const patchKeys = Object.keys(patch)

      // If there are key intersections between the query and the patch, a warning is issued.
      // Patches should not overwrite each other, otherwise, upon reload, an incorrect value will be restored.
      patchKeys.forEach((key) => {
        if (newQueryRaw.hasOwnProperty(key)) {
          console.warn(
            `[vue-context-storage] Key ${key} is already present, overriding ` +
              (item.options?.causer || ''),
          )
        }
      })

      if (!patchKeys.length && preserveEmptyState) {
        patch[prefix || this.options.emptyPlaceholder] = null
      }

      Object.assign(newQueryRaw, patch)
    })

    let newQuery = { ...newQueryRaw }

    /*
     * It will not delete from the query the keys that are not used in the patch.
     *
     * It will only work if the registered item has a transform, otherwise without
     * it - all keys are dumped into item.data during the initial fill from initialState
     */
    if (this.options.preserveUnusedKeys) {
      newQuery = { ...this.route.query, ...newQuery }
    }

    if (this.currentQuery !== undefined) {
      //Perform a diff of keys between currentQuery and newQueryRaw, and remove the keys that are in currentQuery but not in newQueryRaw.
      //This is necessary to ensure that the query string does not contain keys that are no longer used.
      Object.keys(this.currentQuery).forEach((key) => {
        if (!newQueryRaw.hasOwnProperty(key)) {
          delete newQuery[key]
        }
      })
    }

    if (Object.keys(newQuery).length > 1 && newQuery[this.options.emptyPlaceholder] === null) {
      delete newQuery[this.options.emptyPlaceholder]
    }

    newQuery = sortQueryByReference(newQuery, newQueryRaw)

    return { newQuery, newQueryRaw }
  }
}
