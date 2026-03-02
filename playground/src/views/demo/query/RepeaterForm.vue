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
import { zObjectArray } from 'vue-context-storage/zod'

const { onlyChanges, transformMethod } = defineProps<{
  onlyChanges: boolean
  transformMethod: 'manual' | 'schema'
}>()

const codeExpanded = defineModel<boolean>('codeExpanded', { default: false })

interface Item {
  product: string
  quantity: number
}

const data = reactive({
  title: '',
  price: 0 as number | null,
  items: [] as Item[],
})

// --- Schema approach (Zod) ---

const ItemSchema = z.object({
  product: z.string().default(''),
  quantity: z.coerce.number().default(0),
})

const DataSchema = z.object({
  title: z.string().default(''),
  price: z.coerce.number().nullable().default(0),
  items: zObjectArray(ItemSchema),
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
      title: transform.asString(value.title),
      price: transform.asNumber(value.price, { nullable: true }),
      items: transform.asObjectArray(value.items, (entry) => ({
        product: transform.asString(entry.product as string | null | undefined),
        quantity: transform.asNumber(entry.quantity as string | number | null | undefined),
      })),
    }),
  })
}

function addItem(): void {
  data.items.push({ product: '', quantity: 1 })
}

function removeItem(index: number): void {
  data.items.splice(index, 1)
}

const exampleCode = computed(() =>
  transformMethod === 'schema'
    ? `import { reactive } from 'vue'
import { z } from 'zod'
import { useContextStorage } from 'vue-context-storage'
import { zObjectArray } from 'vue-context-storage/zod'

const ItemSchema = z.object({
  product: z.string().default(''),
  quantity: z.coerce.number().default(0),
})

const DataSchema = z.object({
  title: z.string().default(''),
  price: z.coerce.number().nullable().default(0),
  items: zObjectArray(ItemSchema),
})

const data = reactive({
  title: '',
  price: 0 as number | null,
  items: [] as Item[],
})

useContextStorage('query', data, {
  onlyChanges: ${onlyChanges},
  schema: DataSchema,
})

// URL will look like:
// ?title=Order&price=99&items[0][product]=Apple&items[0][quantity]=5`
    : `import { reactive } from 'vue'
import { transform, useContextStorage } from 'vue-context-storage'

interface Item {
  product: string
  quantity: number
}

const data = reactive({
  title: '',
  price: 0 as number | null,
  items: [] as Item[],
})

useContextStorage('query', data, {
  onlyChanges: ${onlyChanges},
  transform: (value) => ({
    title: transform.asString(value.title),
    price: transform.asNumber(value.price, { nullable: true }),
    items: transform.asObjectArray(value.items, (entry) => ({
      product: transform.asString(entry.product),
      quantity: transform.asNumber(entry.quantity),
    })),
  }),
})

// URL will look like:
// ?title=Order&price=99&items[0][product]=Apple&items[0][quantity]=5`,
)
</script>

<template>
  <NForm label-placement="left" label-width="80" class="max-w-lg">
    <NFormItem label="Title" feedback="String field synced with URL">
      <NInput v-model:value="data.title" placeholder="Enter title" />
    </NFormItem>

    <NFormItem label="Price" feedback="Number field synced with URL">
      <NInputNumber v-model:value="data.price" placeholder="Enter price" class="w-full" />
    </NFormItem>

    <NFormItem
      label="Items"
      feedback="Array of objects — serialized as items[0][product], items[0][quantity], etc."
    >
      <div class="w-full flex flex-col gap-2">
        <div v-for="(item, index) in data.items" :key="index" class="flex items-center gap-2">
          <NInput
            :value="item.product"
            @update:value="item.product = $event"
            placeholder="Product name"
            class="flex-1"
          />
          <NInputNumber
            :value="item.quantity"
            @update:value="item.quantity = $event ?? 0"
            placeholder="Qty"
            :min="0"
            style="width: 120px"
          />
          <NButton tertiary type="error" size="small" @click="removeItem(index)"> Remove </NButton>
        </div>

        <div>
          <NButton @click="addItem" type="primary" dashed size="small"> + Add item </NButton>
        </div>
      </div>
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
