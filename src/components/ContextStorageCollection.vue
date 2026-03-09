<script lang="ts">
import { type ContextStorageHandlerFactory } from '../handlers'
import { defineComponent, type PropType } from 'vue'
import { useRouter } from 'vue-router'
import { defaultHandlers } from '../constants'
import { useContextStorageCollection } from '../composables/useContextStorageCollection'

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
     * `<ContextStorageCollection :additional-handlers="[createQueryHandler({ mode: 'push' })]">`
     */
    additionalHandlers: {
      type: Object as PropType<ContextStorageHandlerFactory[]>,
      default: undefined,
    },
  },
  setup(props, { slots }) {
    const router = useRouter()

    const factories = props.additionalHandlers
      ? [...props.handlers, ...props.additionalHandlers]
      : props.handlers

    const collection = useContextStorageCollection(factories)

    router.isReady().then(() => {
      collection.markAsReady()
    })

    return () => {
      return slots.default?.()
    }
  },
})
</script>
