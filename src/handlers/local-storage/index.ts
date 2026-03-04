import type { ContextStorageHandlerFactory } from '../../handlers'
import { contextStorageLocalStorageHandler } from '../../symbols'
import { createWebStorageHandlerInstance } from '../web-storage-base'
import type { LocalStorageHandlerBaseOptions } from './types'

export function createLocalStorageHandler(
  customOptions?: LocalStorageHandlerBaseOptions,
): ContextStorageHandlerFactory {
  const factory: ContextStorageHandlerFactory = () =>
    createWebStorageHandlerInstance({
      storage: localStorage,
      injectionKey: contextStorageLocalStorageHandler,
      handlerName: 'localStorage',
      options: { listenToStorageEvents: true, ...customOptions },
    })

  return factory
}
