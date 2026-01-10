<script lang="ts">
import { defineComponent, h } from 'vue'
import { useContextStorageActivator } from '../composables/useContextStorageActivator'

export default defineComponent({
  setup(_, { slots }) {
    const { activate } = useContextStorageActivator()

    return () => h('div', { onMousedown: activate }, slots.default?.())
  },
})
</script>
