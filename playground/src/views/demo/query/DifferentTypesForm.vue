<script setup lang="ts">
import { computed, reactive } from 'vue'
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

const { onlyChanges, transformMethod } = defineProps<{
  onlyChanges: boolean
  transformMethod: 'manual' | 'schema'
}>()

const codeExpanded = defineModel<boolean>('codeExpanded', { default: false })

const enumValues = ['White', 'Gray', 'Black'] as const
const enumOptions = enumValues.map((v) => ({
  label: v,
  value: v,
}))

// --- Schema approach (Zod) ---

const DataSchema = z.object({
  name: z.string(),
  title: z.string().nullable(),
  search: z.string().optional(),
  number: z.coerce.number().nullable(),
  switch: z.boolean(),
  users_ids: z.coerce.number().array(),
  string_array: z.coerce.string().array(),
  enum_array: z.enum(enumValues).array(),
})

type DataSchemaType = z.infer<typeof DataSchema>

const data = reactive<DataSchemaType>({
  name: 'John',
  title: null,
  search: undefined,
  number: 42,
  switch: false,
  users_ids: [],
  string_array: [],
  enum_array: [],
})

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
      users_ids: transform.asNumberArray(value.users_ids),
      string_array: transform.asArray(value.string_array),
      enum_array: transform.asArray(value.enum_array),
    }),
  })
}

const usersOptions = [
  { label: 'John', value: 1 },
  { label: 'Jane', value: 2 },
  { label: 'Jack', value: 3 },
]

const stringOptions = [
  { label: 'John', value: 'John' },
  { label: 'Jane', value: 'Jane' },
  { label: 'Jack', value: 'Jack' },
]

const exampleCode = computed(() =>
  transformMethod === 'schema'
    ? `import { reactive } from 'vue'
import { z } from 'zod'
import { useContextStorage } from 'vue-context-storage'

const enumValues = ['White', 'Gray', 'Black'] as const

const DataSchema = z.object({
  name: z.string(),
  title: z.string().nullable(),
  search: z.string().optional(),
  number: z.coerce.number().nullable(),
  switch: z.boolean(),
  users_ids: z.coerce.number().array(),
  string_array: z.string().array(),
  enum_array: z.enum(enumValues).array(),
})

const data = reactive({
  name: 'John',
  title: null as string | null,
  search: undefined as string | undefined,
  number: 42 as number | null,
  switch: true,
  users_ids: [] as number[],
  string_array: [] as string[],
  enum_array: [] as (typeof enumValues)[number][],
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
  users_ids: [] as number[],
  string_array: [] as string[],
  enum_array: [] as (typeof enumValues)[number][],
})

useContextStorage('query', data, {
  onlyChanges: ${onlyChanges},
  transform: (value) => ({
    name: transform.asString(value.name),
    title: transform.asString(value.title, { nullable: true }),
    search: transform.asString(value.search, { missable: true }),
    number: transform.asNumber(value.number, { nullable: true }),
    switch: transform.asBoolean(value.switch),
    users_ids: transform.asNumberArray(value.users_ids),
    string_array: transform.asArray(value.string_array),
    enum_array: transform.asArray(value.enum_array),
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
    <NFormItem label="Users IDs" feedback="This field can be only array of numbers">
      <NSelect
        multiple
        v-model:value="data.users_ids"
        :options="usersOptions"
        placeholder="Users"
        class="w-full"
      />
    </NFormItem>
    <NFormItem label="String array" feedback="This field contains array of strings">
      <NSelect v-model:value="data.string_array" multiple :options="stringOptions" class="w-full" />
    </NFormItem>
    <NFormItem label="Enum array" feedback="This field contains enum of strings">
      <NSelect v-model:value="data.enum_array" multiple :options="enumOptions" class="w-full" />
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
