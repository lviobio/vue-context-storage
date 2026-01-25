<script setup lang="ts">
import { NLayout, NLayoutContent, NLayoutHeader } from 'naive-ui'
import { RouterLink } from 'vue-router'
</script>

<template>
  <NLayout>
    <NLayoutHeader bordered class="header main-header">
      <RouterLink to="/" class="title">Vue Context Storage</RouterLink>
      <RouterLink to="/" class="demo-link">Demo</RouterLink>
    </NLayoutHeader>
    <NLayoutContent content-style="padding: 24px;">
      <RouterView />
    </NLayoutContent>
  </NLayout>
</template>

<style scoped>
.header {
  padding: 0 24px;
  display: flex;
  align-items: center;
}

.main-header {
  height: 40px;
  gap: 24px;
}

.sub-header {
  height: 36px;
}

.title {
  font-weight: 600;
  white-space: nowrap;
  text-decoration: none;
  color: inherit;
}

.demo-link {
  color: var(--n-item-text-color-active, #18a058);
  text-decoration: none;
  font-weight: 500;
}
</style>
