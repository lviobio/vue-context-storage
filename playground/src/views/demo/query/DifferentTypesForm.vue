<script setup lang="ts">
import { reactive, computed } from 'vue'
import {
  NButton,
  NCode,
  NCollapse,
  NCollapseItem,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
} from 'naive-ui'
import { z } from 'zod'
import { transform, useContextStorage } from 'vue-context-storage'
import { zUrlBoolean } from 'vue-context-storage/zod'

const { onlyChanges, transformMethod } = defineProps<{
  onlyChanges: boolean
  transformMethod: 'manual' | 'schema'
}>()

const codeExpanded = defineModel<boolean>('codeExpanded', { default: false })

const data = reactive({
  name: 'John',
  title: null as string | null,
  search: undefined as string | undefined,
  number: 42 as number | null,
  switch: true,
})

// --- Schema approach (Zod) ---

const DataSchema = z.object({
  name: z.string().default('John'),
  title: z.string().nullable().default(null),
  search: z.string().optional(),
  number: z.coerce.number().nullable().default(42),
  switch: zUrlBoolean(true),
})

// --- Manual approach (transform helpers) ---

if (transformMethod === 'schema') {
  useContextStorage('query', data, {
    onlyChanges,
    // search is `string | undefined` in data but `search?: string` in Zod's output —
    // functionally equivalent at runtime, so we cast to satisfy the type checker.
    schema: DataSchema as any,
  })
} else {
  useContextStorage('query', data, {
    onlyChanges,
    transform: (value) => ({
      name: transform.asString(value.name),
      title: transform.asString(value.title, { nullable: true }),
      search: transform.asString(value.search, { missable: true }),
      number: transform.asNumber(value.number, { nullable: true }),
      switch: transform.asBoolean(value.switch),
    }),
  })
}

const exampleCode = computed(() =>
  transformMethod === 'schema'
    ? `import { reactive } from 'vue'
import { z } from 'zod'
import { useContextStorage } from 'vue-context-storage'
import { zUrlBoolean } from 'vue-context-storage/zod'

const DataSchema = z.object({
  name: z.string().default('John'),
  title: z.string().nullable().default(null),
  search: z.string().optional(),
  number: z.coerce.number().nullable().default(42),
  switch: zUrlBoolean(true),
})

const data = reactive({
  name: 'John',
  title: null as string | null,
  search: undefined as string | undefined,
  number: 42 as number | null,
  switch: true,
})

useContextStorage('query', data, {
  onlyChanges: ${onlyChanges},
  schema: DataSchema,
})`
    : `import { reactive } from 'vue'
import { transform, useContextStorage } from 'vue-context-storage'

const data = reactive({
  name: 'John',
  title: null as string | null,
  search: undefined as string | undefined,
  number: 42 as number | null,
  switch: true,
})

useContextStorage('query', data, {
  onlyChanges: ${onlyChanges},
  transform: (value) => ({
    name: transform.asString(value.name),
    title: transform.asString(value.title, { nullable: true }),
    search: transform.asString(value.search, { missable: true }),
    number: transform.asNumber(value.number, { nullable: true }),
    switch: transform.asBoolean(value.switch),
  }),
})`,
)
</script>

<template>
  <NForm label-placement="left" label-width="80" class="max-w-lg">
    <NFormItem label="Name" feedback="This field can be only string">
      <NInput v-model:value="data.name" placeholder="Enter name" />
    </NFormItem>
    <NFormItem label="Title" feedback="This field can be only string or null">
      <NInput
        :value="data.title"
        @update:value="data.title = $event === '' ? null : $event"
        placeholder="Enter title"
      />
    </NFormItem>
    <NFormItem label="Search" feedback="This field can be only string or undefined">
      <NInput
        :value="data.search"
        @update:value="data.search = $event === '' ? undefined : $event"
        placeholder="Enter search"
      />
    </NFormItem>
    <NFormItem label="Number" feedback="This field can be only number or null">
      <NInputNumber v-model:value="data.number" placeholder="Enter number" class="w-full" />
    </NFormItem>
    <NFormItem label="Switch" feedback="This field can be only boolean">
      <NSwitch v-model:value="data.switch" />
    </NFormItem>
    <NFormItem>
      <NButton @click="data.number = Math.ceil(Math.random() * 1000)">Random number</NButton>
    </NFormItem>
  </NForm>

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
