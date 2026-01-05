<script setup lang="ts">
import { reactive } from 'vue'
import { useContextStorageQueryHandler } from '../../../src'

const data = reactive({
  name: '',
  title: '',
  search: '',
  number: null as number | null,
})

useContextStorageQueryHandler(data)
</script>

<template>
  <p>Home</p>
  <div style="display: flex; flex-direction: column; gap: 1rem">
    <div>
      <label>Name: </label>
      <input type="text" v-model="data.name" />
    </div>
    <div>
      <label>Title: </label>
      <input type="text" v-model="data.title" />
    </div>
    <div>
      <label>Search: </label>
      <input type="text" v-model="data.search" />
    </div>
    <div>
      <label>Number: </label>
      <input type="number" v-model.number="data.number" />
    </div>

    <div>
      <button @click="data.number = Math.ceil(Math.random() * 1000)">Random number</button>
    </div>
  </div>
</template>
