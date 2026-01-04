<script lang="ts">
import { defineComponent, h, inject } from 'vue'
import {
  contextStorageCollectionInjectKey,
  contextStorageCollectionItemInjectKey,
} from '../injectionSymbols'

export default defineComponent({
  setup(_, { slots }) {
    const collection = inject(contextStorageCollectionInjectKey)!
    const item = inject(contextStorageCollectionItemInjectKey)!

    const onActivate = () => {
      collection.setActive(item)
    }

    return () => h('div', { onMousedown: onActivate }, slots.default?.())
  },
})
</script>
