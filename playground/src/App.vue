<script setup lang="ts">
import { NConfigProvider, NMessageProvider } from 'naive-ui'
import hljs from 'highlight.js/lib/core'
import typescript from 'highlight.js/lib/languages/typescript'

hljs.registerLanguage('typescript', typescript)
</script>

<template>
  <NConfigProvider
    :hljs="hljs"
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
