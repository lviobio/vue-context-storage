<script lang="ts">
import { type ContextStorageHandlerConstructor } from '../handlers'
import { defaultHandlers } from '../constants'
import { useRouter } from 'vue-router'
import { createItem } from '../collection'
import { useContextStorageItemProvider } from '../composables/useContextStorageProvider'
import { defineComponent, type PropType } from 'vue'

export default defineComponent({
  props: {
    handlers: {
      type: Object as PropType<ContextStorageHandlerConstructor[]>,
      default: () => defaultHandlers,
    },
  },
  setup({ handlers }, { slots }) {
    const item = createItem(handlers, { key: 'main' })

    useContextStorageItemProvider(item)

    const router = useRouter()

    const initialNavigatorState = new Map<
      ContextStorageHandlerConstructor,
      Record<string, unknown>
    >()
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

    const initItem = () => {
      item.handlers.forEach((handler) => {
        const state = initialNavigatorState.get(
          handler.constructor as ContextStorageHandlerConstructor,
        )

        if (!state) {
          return
        }

        handler.setInitialState?.(state)
        handler.setEnabled?.(true, true)
      })
    }

    router.isReady().then(() => {
      initialNavigatorStateResolvers.forEach((resolver, handler) => {
        initialNavigatorState.set(handler, resolver())
      })
      initItem()
    })

    return () => slots.default?.()
  },
})
</script>
