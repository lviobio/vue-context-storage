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
  },
  setup({ handlers }, { slots }) {
    const router = useRouter()

    const collection = useContextStorageCollection(handlers)

    router.isReady().then(() => {
      collection.markAsReady()
    })

    return () => {
      return slots.default?.()
    }
  },
})
</script>
