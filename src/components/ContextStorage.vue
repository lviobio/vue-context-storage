<template>
  <ContextStorageProvider :item-key="itemKey">
    <ContextStorageActivator>
      <slot />
    </ContextStorageActivator>
  </ContextStorageProvider>
</template>

<script setup lang="ts">
import ContextStorageActivator from './ContextStorageActivator.vue'
import ContextStorageProvider from './ContextStorageProvider.vue'
import { type ContextStorageHandlerConstructor } from '../handlers'
import { defaultHandlers } from '../constants'
import { useContextStorageCollection } from '../composables/useContextStorageCollection'
import { useRouter } from 'vue-router'

const itemKey = 'main'

interface Props {
  handlers?: ContextStorageHandlerConstructor[]
}

const { handlers = defaultHandlers } = defineProps<Props>()

const router = useRouter()
const collection = useContextStorageCollection(handlers)

const initialNavigatorState = new Map<ContextStorageHandlerConstructor, Record<string, unknown>>()
const initialNavigatorStateResolvers = new Map<
  ContextStorageHandlerConstructor,
  () => Record<string, unknown>
>()

handlers.forEach((handler) => {
  if (!handler.getInitialStateResolver) {
    return
  }

  initialNavigatorStateResolvers.set(handler, handler.getInitialStateResolver())
})

const activateMainItem = () => {
  const item = collection.findItemByKey(itemKey)
  if (!item) {
    throw new Error(`[vue-context-storage] Cannot find "${itemKey}" item in collection`)
  }

  item.handlers.forEach((handler) => {
    const state = initialNavigatorState.get(handler.constructor as ContextStorageHandlerConstructor)

    if (!state) {
      return
    }

    handler.setInitialState?.(state)
  })

  collection.setActive(item)
}

router.isReady().then(() => {
  collection.markAsReady()
})

collection.isReady().then(() => {
  initialNavigatorStateResolvers.forEach((resolver, handler) => {
    initialNavigatorState.set(handler, resolver())
  })

  activateMainItem()
})
</script>
