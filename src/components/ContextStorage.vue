<template>
  <ContextStorageCollection :handlers="handlers">
    <ContextStorageProvider item-key="main">
      <ContextStorageActivator>
        <slot />
      </ContextStorageActivator>
    </ContextStorageProvider>
  </ContextStorageCollection>
</template>

<script setup lang="ts">
import ContextStorageActivator from './ContextStorageActivator.vue'
import ContextStorageCollection from './ContextStorageCollection.vue'
import ContextStorageProvider from './ContextStorageProvider.vue'
import { type ContextStorageHandlerConstructor } from '../handlers'

import { defaultHandlers } from '../constants'

interface Props {
  handlers: ContextStorageHandlerConstructor[]
}

const { handlers = defaultHandlers } = defineProps<Props>()
</script>
