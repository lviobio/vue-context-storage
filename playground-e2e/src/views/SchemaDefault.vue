<script setup lang="ts">
import { reactive } from 'vue'
import { z } from 'zod'
import { useContextStorage } from 'vue-context-storage'

/**
 * Fixture that exercises all three default baselines on the same field:
 *
 *  - schema `.default(1)`                    → page=1 omitted
 *  - schema `.meta({ additionalDefaultData: 5 })` → page=5 omitted
 *  - option-level `additionalDefaultData: { page: 3 }` → page=3 omitted
 *
 *  page=2 and page=4 must appear in the URL.
 */
const Schema = z.object({
  page: z.coerce.number().default(1).meta({ additionalDefaultData: 5 }),
  search: z.string().default(''),
})

const data = reactive({ page: undefined as number | undefined, search: '' })

useContextStorage('query', data, {
  key: 'filters',
  schema: Schema,
  additionalDefaultData: { page: 3 },
})
</script>

<template>
  <main>
    <h1>Schema default baseline</h1>

    <p>
      page = <span data-testid="page-value">{{ data.page }}</span>
    </p>

    <button data-testid="set-page-1" @click="data.page = 1">page = 1</button>
    <button data-testid="set-page-2" @click="data.page = 2">page = 2</button>
    <button data-testid="set-page-3" @click="data.page = 3">page = 3</button>
    <button data-testid="set-page-4" @click="data.page = 4">page = 4</button>
    <button data-testid="set-page-5" @click="data.page = 5">page = 5</button>

    <label>
      search
      <input data-testid="search" v-model="data.search" placeholder="search" />
    </label>
  </main>
</template>
