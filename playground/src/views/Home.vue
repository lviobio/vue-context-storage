<script setup lang="ts">
import { reactive } from 'vue'
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
import { transform, useContextStorage } from '../../../src'

const data = reactive({
  name: '',
  title: '',
  search: '',
  number: null as number | null,
})

useContextStorage('query', data, {
  transform: (value) => ({
    name: transform.asString(value.name),
    title: transform.asString(value.title),
    search: transform.asString(value.search),
    number: transform.asNumber(value.number, { nullable: true }),
  }),
})

const exampleCode = `import { reactive } from 'vue'
import { transform, useContextStorage } from 'vue-context-storage'

const data = reactive({
  name: '',
  title: '',
  search: '',
  number: null as number | null,
})

useContextStorage('query', data, {
  transform: (value) => ({
    name: transform.asString(value.name),
    title: transform.asString(value.title),
    search: transform.asString(value.search),
    number: transform.asNumber(value.number, { nullable: true }),
  }),
})`
</script>

<template>
  <h2 class="text-xl font-semibold mb-4">Query Handler Demo</h2>
  <p class="text-sm text-gray-500 mb-4">
    Data is synced with URL query parameters. Changes are reflected in the URL.
  </p>

  <NForm label-placement="left" label-width="80" class="max-w-lg">
    <NFormItem label="Name">
      <NInput v-model:value="data.name" placeholder="Enter name" />
    </NFormItem>
    <NFormItem label="Title">
      <NInput v-model:value="data.title" placeholder="Enter title" />
    </NFormItem>
    <NFormItem label="Search">
      <NInput v-model:value="data.search" placeholder="Enter search" />
    </NFormItem>
    <NFormItem label="Number">
      <NInputNumber v-model:value="data.number" placeholder="Enter number" class="w-full" />
    </NFormItem>
    <NFormItem>
      <NButton @click="data.number = Math.ceil(Math.random() * 1000)">Random number</NButton>
    </NFormItem>
  </NForm>

  <div class="mt-4 mb-6">
    <p class="text-sm text-gray-500 mb-2">Current state:</p>
    <code class="text-sm">{{ data }}</code>
  </div>

  <NCollapse>
    <NCollapseItem title="Code Example" name="code">
      <NCode :code="exampleCode" language="typescript" word-wrap />
    </NCollapseItem>
  </NCollapse>
</template>
