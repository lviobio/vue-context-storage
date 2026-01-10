<script lang="ts">
import { defineComponent } from 'vue'
import { useContextStorageCollection } from '../composables/useContextStorageProvider'

export default defineComponent({
  props: {
    itemKey: {
      type: String,
      required: true,
    },
  },
  setup(props, { slots }) {
    useContextStorageCollection(props.itemKey)

    return () => slots.default?.()
  },
})
</script>
