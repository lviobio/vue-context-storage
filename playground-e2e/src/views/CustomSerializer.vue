<script setup lang="ts">
import {
  ContextStorage,
  createQueryHandler,
  defaultHandlers,
  type QuerySerializer,
} from 'vue-context-storage'
import CustomSerializerForm from './CustomSerializerForm.vue'

// JSON-encode each registration's data under its key — a format the built-in
// serializer could never produce. Proves the `serializer` factory hook is wired
// through the real handler end-to-end.
const jsonSerializer: QuerySerializer = {
  serialize: (data, options) => {
    const key = options?.key ?? '_'
    return { [key]: JSON.stringify(data) }
  },
  deserialize: (query) => {
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(query)) {
      try {
        out[key] = JSON.parse(query[key] as string)
      } catch {
        out[key] = query[key]
      }
    }
    return out
  },
}

// Replace the inherited query handler for everything inside this view.
const handlers = [...defaultHandlers, createQueryHandler({ serializer: jsonSerializer })]
</script>

<template>
  <ContextStorage :handlers="handlers">
    <CustomSerializerForm />
  </ContextStorage>
</template>
