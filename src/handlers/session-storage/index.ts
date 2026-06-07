import type { ContextStorageHandlerFactory } from '../../handlers'
import { contextStorageSessionStorageHandler } from '../../symbols'
import { createWebStorageHandlerInstance } from '../web-storage-base'
import type { SessionStorageHandlerBaseOptions } from './types'

export function createSessionStorageHandler(
  customOptions?: SessionStorageHandlerBaseOptions,
): ContextStorageHandlerFactory {
  const factory: ContextStorageHandlerFactory = () =>
    createWebStorageHandlerInstance({
      storage: sessionStorage,
      injectionKey: contextStorageSessionStorageHandler,
      handlerName: 'sessionStorage',
      options: { listenToStorageEvents: true, ...customOptions },
    })

  return factory
}
