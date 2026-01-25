<script setup lang="ts">
import { reactive } from 'vue'
import { NForm, NFormItem, NInput, NInputNumber, NButton } from 'naive-ui'
import { transform, useContextStorageQueryHandler } from '../../../src'

const data = reactive({
  name: '',
  title: '',
  search: '',
  number: null as number | null,
})

useContextStorageQueryHandler(data, {
  transform: (value) => ({
    name: transform.asString(value.name),
    title: transform.asString(value.title),
    search: transform.asString(value.search),
    number: transform.asNumber(value.number, { nullable: true }),
  }),
})
</script>

<template>
  <h2 class="text-xl font-semibold mb-4">Home</h2>
  <NForm label-placement="left" label-width="80">
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
  <code>{{ data }}</code>
</template>
