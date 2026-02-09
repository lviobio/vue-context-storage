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

    const initialStateResolvers = new Map<number, () => Record<string, unknown>>()

    factories.forEach((factory, index) => {
      if (!factory.getInitialStateResolver) {
        return
      }

      initialStateResolvers.set(index, factory.getInitialStateResolver())
    })

    const initItem = () => {
      item.handlers.forEach((handler, index) => {
        const resolver = initialStateResolvers.get(index)

        if (resolver) {
          handler.setInitialState?.(resolver())
        }

        handler.setEnabled?.(true, true)
      })
    }

    router.isReady().then(initItem)

    return () => slots.default?.()
  },
})
</script>
