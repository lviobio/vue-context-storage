import type { InjectionKey, MaybeRefOrGetter } from 'vue'

export interface ContextStorageHandlerConstructor<T = any> {
  new (): ContextStorageHandler<T>
  getInitialStateResolver?: () => () => Record<string, unknown>
}

export interface RegisterBaseOptions {
  causer: string
  uid: number
}

export interface ContextStorageHandler<T> {
  register: (data: MaybeRefOrGetter<T>, options: RegisterBaseOptions) => () => void
  setInitialState?: (state: Record<string, unknown>) => void
  setEnabled?: (enabled: boolean, initial: boolean) => void
  getInjectionKey(): InjectionKey<ContextStorageHandler<T>>
}
