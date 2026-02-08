import type { ContextStorageHandlerConstructor } from '../../handlers'
import { contextStorageLocalStorageHandler } from '../../symbols'
import type { InjectionKey } from 'vue'
import { ContextStorageWebStorageHandler, createWebStorageComposable } from '../web-storage-base'
import type { LocalStorageHandlerBaseOptions } from './types'

export class ContextStorageLocalStorageHandler<
  T extends Record<string, unknown>,
> extends ContextStorageWebStorageHandler<T> {
  protected readonly storage: Storage
  protected readonly injectionKey: InjectionKey<ContextStorageLocalStorageHandler<T>>
  protected readonly handlerName = 'localStorage'

  static customHandlerOptions: LocalStorageHandlerBaseOptions = {}

  constructor() {
    const defaultOptions: Required<LocalStorageHandlerBaseOptions> = {
      listenToStorageEvents: true,
      ...ContextStorageLocalStorageHandler.customHandlerOptions,
    }

    super(defaultOptions)

    this.storage = localStorage
    this.injectionKey = contextStorageLocalStorageHandler

    this.initializeStorageListener()
  }

  // noinspection JSUnusedGlobalSymbols
  static configure<T extends Record<string, unknown>>(
    options: LocalStorageHandlerBaseOptions,
  ): ContextStorageHandlerConstructor<T> {
    ContextStorageLocalStorageHandler.customHandlerOptions = options

    return ContextStorageLocalStorageHandler<T>
  }
}

export const useContextStorageLocalStorage = createWebStorageComposable(
  contextStorageLocalStorageHandler,
  'ContextStorageLocalStorageHandler',
)
