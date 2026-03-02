<script setup lang="ts">
import { reactive, computed, watch } from 'vue'
import {
  NCode,
  NCollapse,
  NCollapseItem,
  NDataTable,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NSpace,
} from 'naive-ui'
import { z } from 'zod'
import { transform, useContextStorage } from 'vue-context-storage'

const { onlyChanges, transformMethod } = defineProps<{
  onlyChanges: boolean
  transformMethod: 'manual' | 'schema'
}>()

const codeExpanded = defineModel<boolean>('codeExpanded', { default: false })

const PAGE_SIZE = 3

// --- Schema approach (Zod) ---

const DataSchema = z.object({
  page: z.coerce.number(),
  filters: z.object({
    title: z.string(),
    created_at: z.object({
      from: z.coerce.number().nullable(),
      to: z.coerce.number().nullable(),
    }),
  }),
})

const data = reactive<z.infer<typeof DataSchema>>({
  page: 1,
  filters: {
    title: '',
    created_at: {
      from: null,
      to: null,
    },
  },
})

// --- Manual approach (transform helpers) ---

if (transformMethod === 'schema') {
  useContextStorage('query', data, {
    onlyChanges,
    schema: DataSchema,
  })
} else {
  useContextStorage('query', data, {
    onlyChanges,
    transform: (value) => ({
      page: transform.asNumber(value.page, { fallbackValue: 1 }),
      filters: {
        title: transform.asString(value.filters?.title),
        created_at: {
          from: transform.asNumber(value.filters?.created_at?.from, { nullable: true }),
          to: transform.asNumber(value.filters?.created_at?.to, { nullable: true }),
        },
      },
    }),
  })
}

// Reset page to 1 when filters change
watch(
  () => data.filters,
  () => {
    data.page = 1
  },
  { deep: true },
)

// --- Mock table data ---

const allRows = [
  { id: 1, title: 'Introduction to Vue', created_at: 1700000000 },
  { id: 2, title: 'Advanced TypeScript', created_at: 1705000000 },
  { id: 3, title: 'State Management Patterns', created_at: 1710000000 },
  { id: 4, title: 'URL Query Synchronization', created_at: 1715000000 },
  { id: 5, title: 'Building a Table Component', created_at: 1720000000 },
  { id: 6, title: 'Zod Schema Validation', created_at: 1725000000 },
  { id: 7, title: 'Vue Router Deep Dive', created_at: 1730000000 },
  { id: 8, title: 'Testing Best Practices', created_at: 1735000000 },
]

const columns = [
  { title: 'ID', key: 'id', width: 60 },
  { title: 'Title', key: 'title' },
  {
    title: 'Created At',
    key: 'created_at',
    render: (row: (typeof allRows)[0]) => new Date(row.created_at * 1000).toLocaleDateString(),
  },
]

const filteredRows = computed(() =>
  allRows.filter((row) => {
    if (data.filters.title && !row.title.toLowerCase().includes(data.filters.title.toLowerCase())) {
      return false
    }
    if (data.filters.created_at.from !== null && row.created_at < data.filters.created_at.from) {
      return false
    }
    if (data.filters.created_at.to !== null && row.created_at > data.filters.created_at.to) {
      return false
    }
    return true
  }),
)

const pagination = computed(() => ({
  page: data.page,
  pageSize: PAGE_SIZE,
  itemCount: filteredRows.value.length,
  prefix: ({ itemCount }: { itemCount: number | undefined }) => `Total: ${itemCount ?? 0}`,
}))

const exampleCode = computed(() =>
  transformMethod === 'schema'
    ? `import { reactive } from 'vue'
import { z } from 'zod'
import { useContextStorage } from 'vue-context-storage'

const DataSchema = z.object({
  page: z.coerce.number(),
  filters: z.object({
    title: z.string(),
    created_at: z.object({
      from: z.coerce.number().nullable(),
      to: z.coerce.number().nullable(),
    }),
  }),
})

const data = reactive<z.infer<typeof DataSchema>>({
  page: 1,
  filters: {
    title: '',
    created_at: {
      from: null,
      to: null,
    },
  },
})

useContextStorage('query', data, {
  onlyChanges: ${onlyChanges},
  schema: DataSchema,
})

// URL will look like:
// ?page=2&filters[title]=Vue&filters[created_at][from]=1700000000`
    : `import { reactive } from 'vue'
import { transform, useContextStorage } from 'vue-context-storage'

const data = reactive({
  page: 1,
  filters: {
    title: '',
    created_at: {
      from: null as number | null,
      to: null as number | null,
    },
  },
})

useContextStorage('query', data, {
  onlyChanges: ${onlyChanges},
  transform: (value) => ({
    page: transform.asNumber(value.page, { fallbackValue: 1 }),
    filters: {
      title: transform.asString(value.filters?.title),
      created_at: {
        from: transform.asNumber(value.filters?.created_at?.from, { nullable: true }),
        to: transform.asNumber(value.filters?.created_at?.to, { nullable: true }),
      },
    },
  }),
})

// URL will look like:
// ?page=2&filters[title]=Vue&filters[created_at][from]=1700000000`,
)
</script>

<template>
  <NForm label-placement="left" label-width="100">
    <NSpace align="end" :wrap="true">
      <NFormItem label="Title" feedback="Filters rows by title substring">
        <NInput v-model:value="data.filters.title" placeholder="Search by title" clearable />
      </NFormItem>

      <NFormItem label="Created from" feedback="Unix timestamp (nested object in URL)">
        <NInputNumber
          v-model:value="data.filters.created_at.from"
          placeholder="From"
          clearable
          class="w-full"
        />
      </NFormItem>

      <NFormItem label="Created to" feedback="Unix timestamp (nested object in URL)">
        <NInputNumber
          v-model:value="data.filters.created_at.to"
          placeholder="To"
          clearable
          class="w-full"
        />
      </NFormItem>
    </NSpace>
  </NForm>

  <NDataTable
    :columns="columns"
    :data="filteredRows"
    :pagination="pagination"
    :bordered="true"
    size="small"
    class="mb-4"
    remote
    @update:page="data.page = $event"
  />

  <div class="mt-4 mb-6">
    <p class="text-sm text-gray-500 mb-2">Current state:</p>
    <code class="text-sm">{{ data }}</code>
  </div>

  <NCollapse
    :expanded-names="codeExpanded ? ['code'] : []"
    @update:expanded-names="codeExpanded = ($event as string[]).includes('code')"
  >
    <NCollapseItem title="Code Example" name="code">
      <NCode :code="exampleCode" language="typescript" word-wrap />
    </NCollapseItem>
  </NCollapse>
</template>
