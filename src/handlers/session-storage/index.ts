import type { ContextStorageHandlerFactory } from '../../handlers'
import { contextStorageSessionStorageHandler } from '../../symbols'
import { createWebStorageComposable, createWebStorageHandlerInstance } from '../web-storage-base'
import type { SessionStorageHandlerBaseOptions } from './types'

export function createSessionStorageHandler(
  customOptions?: SessionStorageHandlerBaseOptions,
): ContextStorageHandlerFactory {
  const factory: ContextStorageHandlerFactory = () =>
    createWebStorageHandlerInstance({
      storage: sessionStorage,
      injectionKey: contextStorageSessionStorageHandler,
      handlerName: 'sessionStorage',
      options: { listenToStorageEvents: false, ...customOptions },
    })

  return factory
}

export const useContextStorageSessionStorage = createWebStorageComposable(
  contextStorageSessionStorageHandler,
  'ContextStorageSessionStorageHandler',
)
