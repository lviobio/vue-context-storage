<script setup lang="ts">
import { reactive } from 'vue'
import { z } from 'zod'
import { useContextStorage } from 'vue-context-storage'

/**
 * Fixture for the repeater-form scenario (array of objects).
 *
 * Mirrors the demo playground's RepeaterForm: a dynamic list of
 * `{ product, quantity }` items synced with the URL as
 * `items[0][product]=...&items[0][quantity]=...`, plus flat fields.
 */
interface Item {
  product: string
  quantity: number
}

const ItemSchema = z.object({
  product: z.string().default(''),
  quantity: z.coerce.number().default(0),
})

const DataSchema = z.object({
  title: z.string().default(''),
  price: z.coerce.number().nullable().default(0),
  items: z.array(ItemSchema),
})

const data = reactive({
  title: '',
  price: 0 as number | null,
  items: [] as Item[],
})

useContextStorage('query', data, {
  schema: DataSchema,
})

function addItem(): void {
  data.items.push({ product: '', quantity: 1 })
}

function removeItem(index: number): void {
  data.items.splice(index, 1)
}
</script>

<template>
  <main>
    <h1>Repeater form</h1>

    <p>
      <input v-model="data.title" placeholder="Enter title" data-testid="title" />
    </p>

    <div
      v-for="(item, index) in data.items"
      :key="index"
      :data-testid="`item-${index}`"
      class="item-row"
    >
      <input
        :value="item.product"
        @input="item.product = ($event.target as HTMLInputElement).value"
        placeholder="Product name"
        :data-testid="`item-${index}-product`"
      />
      <input
        :value="item.quantity"
        @input="item.quantity = Number(($event.target as HTMLInputElement).value) || 0"
        placeholder="Qty"
        type="number"
        :data-testid="`item-${index}-quantity`"
      />
      <button :data-testid="`item-${index}-remove`" @click="removeItem(index)">Remove</button>
    </div>

    <p>
      <button data-testid="add-item" @click="addItem">+ Add item</button>
    </p>

    <p>
      items =
      <span data-testid="items-value">{{ JSON.stringify(data.items) }}</span>
    </p>
  </main>
</template>

<style scoped>
.item-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}
</style>
