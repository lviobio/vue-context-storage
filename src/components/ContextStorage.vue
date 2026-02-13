<script lang="ts">
import { type ContextStorageHandlerFactory } from '../handlers'
import { defaultHandlers } from '../constants'
import { useRouter } from 'vue-router'
import { createItem } from '../collection'
import { useContextStorageItemProvider } from '../composables/useContextStorageProvider'
import { defineComponent, type PropType } from 'vue'

export default defineComponent({
  props: {
    handlers: {
      type: Object as PropType<ContextStorageHandlerFactory[]>,
      default: () => defaultHandlers,
    },
  },
  setup({ handlers: factories }, { slots }) {
    const item = createItem(factories, { key: 'main' })

    useContextStorageItemProvider(item)

    const router = useRouter()

    router.isReady().then(() => {
      item.handlers.forEach((handler) => {
        handler.setEnabled?.(true, true)
      })
    })

    return () => slots.default?.()
  },
})
</script>
