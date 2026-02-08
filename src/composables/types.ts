import type { ComputedRef, MaybeRefOrGetter } from 'vue'

export type UseContextStorageResult<T> = {
  data: MaybeRefOrGetter<T>
  stop: () => void
  wasChanged: ComputedRef<boolean>
}
