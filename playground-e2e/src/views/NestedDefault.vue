<script setup lang="ts">
import { reactive } from 'vue'
import { z } from 'zod'
import { useContextStorage } from 'vue-context-storage'

/**
 * Fixture for the nested-object default baseline.
 *
 * `filters` is a nested object that declares its default ONLY at the object
 * level (`.default({ page: 1, sort: 'asc' })`) — the inner fields have no
 * field-level `.default()`. This is the documented best practice (nested
 * objects must carry `.default()` at the object level).
 *
 * Expected: `filters = { page: 1, sort: 'asc' }` matches the schema default and
 * must NOT appear in the URL. Any other value must appear.
 */
const Schema = z.object({
  filters: z
    .object({
      page: z.number(),
      sort: z.string(),
    })
    .default({ page: 1, sort: 'asc' }),
})

const data = reactive({
  filters: { page: undefined as number | undefined, sort: undefined as string | undefined },
})

useContextStorage('query', data, {
  key: 'q',
  schema: Schema,
})
</script>

<template>
  <main>
    <h1>Nested default baseline</h1>

    <p>
      filters =
      <span data-testid="filters-value">{{ JSON.stringify(data.filters) }}</span>
    </p>

    <button
      data-testid="set-default"
      @click="((data.filters.page = 1), (data.filters.sort = 'asc'))"
    >
      defaults (1 / asc)
    </button>
    <button
      data-testid="set-custom"
      @click="((data.filters.page = 2), (data.filters.sort = 'desc'))"
    >
      custom (2 / desc)
    </button>
  </main>
</template>
