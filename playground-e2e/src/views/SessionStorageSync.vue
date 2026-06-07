<script setup lang="ts">
import { reactive } from 'vue'
import { useContextStorage } from 'vue-context-storage'

const data = reactive({
  name: 'John',
  count: 0,
})

useContextStorage('sessionStorage', data, {
  key: 'e2e-session-sync',
})

// Control group with the same storage key — a sessionStorage change must not
// bleed into it and vice versa (storage-area filtering in the shared handler).
const localData = reactive({
  name: 'Local',
  count: 0,
})

useContextStorage('localStorage', localData, {
  key: 'e2e-session-sync',
})
</script>

<template>
  <main>
    <input v-model="data.name" placeholder="Enter session name" data-testid="session-name" />

    <p>
      count = <span data-testid="session-count">{{ data.count }}</span>
    </p>

    <button data-testid="session-increment" @click="data.count++">Increment</button>

    <p>
      local name = <span data-testid="local-name">{{ localData.name }}</span>
    </p>
  </main>
</template>
