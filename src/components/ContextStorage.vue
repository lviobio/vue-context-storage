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
    /**
     * Additional handler factories that are merged with `handlers` (or defaults).
     * Handlers with the same injection key are deduplicated — the last one wins.
     *
     * This allows overriding a single default handler without listing all of them:
     * `<ContextStorage :additional-handlers="[createQueryHandler({ mode: 'push' })]">`
     */
    additionalHandlers: {
      type: Object as PropType<ContextStorageHandlerFactory[]>,
      default: undefined,
    },
  },
  setup(props, { slots }) {
    const factories = props.additionalHandlers
      ? [...props.handlers, ...props.additionalHandlers]
      : props.handlers

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
