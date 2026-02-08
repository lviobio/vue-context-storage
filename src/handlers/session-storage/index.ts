import type { ContextStorageHandlerConstructor } from '../../handlers'
import { contextStorageSessionStorageHandler } from '../../symbols'
import type { InjectionKey } from 'vue'
import { ContextStorageWebStorageHandler, createWebStorageComposable } from '../web-storage-base'
import type { SessionStorageHandlerBaseOptions } from './types'

export class ContextStorageSessionStorageHandler<
  T extends Record<string, unknown>,
> extends ContextStorageWebStorageHandler<T> {
  protected readonly storage: Storage
  protected readonly injectionKey: InjectionKey<ContextStorageSessionStorageHandler<T>>
  protected readonly handlerName = 'sessionStorage'

  static customHandlerOptions: SessionStorageHandlerBaseOptions = {}

  constructor() {
    const defaultOptions: Required<SessionStorageHandlerBaseOptions> = {
      // sessionStorage is per-tab, so cross-tab sync doesn't apply
      listenToStorageEvents: false,
      ...ContextStorageSessionStorageHandler.customHandlerOptions,
    }

    super(defaultOptions)

    this.storage = sessionStorage
    this.injectionKey = contextStorageSessionStorageHandler

    // Still initialize listener in case user explicitly enables it
    this.initializeStorageListener()
  }

  // noinspection JSUnusedGlobalSymbols
  static configure<T extends Record<string, unknown>>(
    options: SessionStorageHandlerBaseOptions,
  ): ContextStorageHandlerConstructor<T> {
    ContextStorageSessionStorageHandler.customHandlerOptions = options

    return ContextStorageSessionStorageHandler<T>
  }
}

export const useContextStorageSessionStorage = createWebStorageComposable(
  contextStorageSessionStorageHandler,
  'ContextStorageSessionStorageHandler',
)
