import type { ContextStorageHandlerConstructor } from '../../handlers'
import { contextStorageLocalStorageHandler } from '../../symbols'
import type { InjectionKey } from 'vue'
import { ContextStorageWebStorageHandler, createWebStorageComposable } from '../web-storage-base'
import type { LocalStorageHandlerBaseOptions } from './types'

export class ContextStorageLocalStorageHandler extends ContextStorageWebStorageHandler {
  protected readonly storage: Storage
  protected readonly injectionKey: InjectionKey<ContextStorageLocalStorageHandler>

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
  static configure(options: LocalStorageHandlerBaseOptions): ContextStorageHandlerConstructor {
    ContextStorageLocalStorageHandler.customHandlerOptions = options

    return ContextStorageLocalStorageHandler
  }
}

export const useContextStorageLocalStorage = createWebStorageComposable(
  contextStorageLocalStorageHandler,
  'ContextStorageLocalStorageHandler',
)
