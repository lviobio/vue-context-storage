<script lang="ts">
import { computed, defineComponent, h, inject, type PropType, provide, toValue } from 'vue'
import { contextStoragePrefixSegmentsInjectKey } from '../injectionSymbols'
import type { ContextStoragePrefixSegment } from '../prefix'
import { KeyedSlot } from './KeyedSlot'

export default defineComponent({
  props: {
    name: {
      type: [String, Object] as PropType<ContextStoragePrefixSegment>,
      required: true,
    },
  },
  setup(props, { slots }) {
    const parentSegments = inject(contextStoragePrefixSegmentsInjectKey, [])

    const segments = computed<ContextStoragePrefixSegment[]>(() => [
      ...toValue(parentSegments),
      props.name,
    ])

    provide(contextStoragePrefixSegmentsInjectKey, segments)

    const segmentKey = computed(() =>
      typeof props.name === 'string' ? props.name : JSON.stringify(props.name),
    )

    return () => h(KeyedSlot, { key: segmentKey.value }, slots)
  },
})
</script>
