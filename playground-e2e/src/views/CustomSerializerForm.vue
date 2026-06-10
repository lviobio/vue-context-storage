<script setup lang="ts">
import { reactive } from 'vue'
import { z } from 'zod'
import { useContextStorage } from 'vue-context-storage'

const data = reactive({
  ids: [] as number[],
  q: '',
})

useContextStorage('query', data, {
  key: 'f',
  schema: z.object({
    ids: z.array(z.number()),
    q: z.string(),
  }),
})
</script>

<template>
  <div>
    <input v-model="data.q" placeholder="query" data-testid="q" />
    <p>
      ids = <span data-testid="ids-value">{{ data.ids.join('|') }}</span>
    </p>
    <button data-testid="set-ids" @click="data.ids = [1, 2, 3]">Set ids</button>
  </div>
</template>
