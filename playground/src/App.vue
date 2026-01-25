<script setup lang="ts">
import { NConfigProvider, NMessageProvider } from 'naive-ui'
</script>

<template>
  <NConfigProvider
    :theme-overrides="{
      Form: {
        labelTextColor: 'var(--color-gray-500)',
        labelPaddingVertical: '0 0 0 2px',
      },
    }"
  >
    <NMessageProvider>
      <ContextStorage>
        <RouterView />
      </ContextStorage>
    </NMessageProvider>
  </NConfigProvider>
</template>

<style>
#app {
  @apply min-h-screen;
}
</style>
