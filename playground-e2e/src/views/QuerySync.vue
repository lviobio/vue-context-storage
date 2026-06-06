<script setup lang="ts">
import { reactive } from 'vue'
import { useContextStorage, transform } from 'vue-context-storage'

const data = reactive({
  name: 'John',
  number: null as number | null,
})

useContextStorage('query', data, {
  transform: (v) => ({
    name: transform.asString(v.name),
    number: transform.asNumber(v.number, { nullable: true }),
  }),
})
</script>

<template>
  <main>
    <input v-model="data.name" placeholder="Enter name" data-testid="name" />

    <p>
      number = <span data-testid="number-value">{{ data.number }}</span>
    </p>

    <button @click="data.number = Math.ceil(Math.random() * 1000)">Random number</button>
  </main>
</template>
