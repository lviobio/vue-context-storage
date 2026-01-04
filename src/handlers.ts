import type { InjectionKey, MaybeRefOrGetter } from 'vue'

export interface ContextStorageHandlerConstructor {
  new (): ContextStorageHandler
  getInitialStateResolver?: () => () => Record<string, unknown>
}

export interface RegisterBaseOptions {
  causer: string
  uid: number
}

export interface ContextStorageHandler {
  register: (data: MaybeRefOrGetter, options: RegisterBaseOptions) => () => void
  setInitialState?: (state: Record<string, unknown>) => void
  setEnabled?: (enabled: boolean, initial: boolean) => void
  getInjectionKey(): InjectionKey<ContextStorageHandler>
}
