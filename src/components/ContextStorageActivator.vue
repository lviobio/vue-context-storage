<script lang="ts">
import { defineComponent, h } from 'vue'
import { useContextStorageCollection } from '../composables/useContextStorageActivator'

export default defineComponent({
  setup(_, { slots }) {
    const { activate } = useContextStorageCollection()

    return () => h('div', { onMousedown: activate }, slots.default?.())
  },
})
</script>
