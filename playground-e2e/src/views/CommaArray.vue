<script setup lang="ts">
import { reactive } from 'vue'
import { z } from 'zod'
import { useContextStorage } from 'vue-context-storage'

const data = reactive({
  ids: [] as number[],
  tags: [] as string[],
})

useContextStorage('query', data, {
  schema: z.object({
    ids: z.array(z.number()),
    tags: z.array(z.string()),
  }),
  serialize: { arrayFormat: 'comma' },
})
</script>

<template>
  <main>
    <p>
      ids = <span data-testid="ids-value">{{ data.ids.join('|') }}</span>
    </p>
    <p>
      tags = <span data-testid="tags-value">{{ data.tags.join('|') }}</span>
    </p>

    <button data-testid="set-ids" @click="data.ids = [1, 2, 3]">Set 1,2,3</button>
    <button data-testid="add-id" @click="data.ids = [...data.ids, 4]">Add 4</button>
    <button data-testid="clear-ids" @click="data.ids = []">Clear</button>
    <button data-testid="set-tags" @click="data.tags = ['Some value', 'with, comma', 'last']">
      Set tags with comma
    </button>
  </main>
</template>
