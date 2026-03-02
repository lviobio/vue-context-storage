<script setup lang="ts">
import { computed, h, ref } from 'vue'
import { useContextStorage } from 'vue-context-storage'
import { RouterLink, useRouter } from 'vue-router'

const router = useRouter()

const menuOptions = [
  {
    label: 'Different types',
    key: 'different-types',
    route: { name: 'demo.query.different-types' },
  },
  {
    label: 'Repeater',
    key: 'repeater',
    route: { name: 'demo.query.repeater' },
  },
  {
    label: 'Table',
    key: 'table',
    route: { name: 'demo.query.table' },
  },
].map((option) => ({
  ...option,
  label: () => h(RouterLink, { to: option.route }, () => option.label),
}))

const activeKey = computed(
  () => menuOptions.find((option) => option.route.name === router.currentRoute.value.name)?.key,
)

useContextStorage(
  'sessionStorage',
  ref({
    activeKey,
  }),
  {
    key: 'query-demo',
  },
)
</script>

<template>
  <div class="flex flex-col gap-4">
    <h2 class="text-xl font-semibold mb-4">Query Handler Demo</h2>
    <p class="text-sm text-gray-500 mb-4">
      Data is synced with URL query parameters. Changes are reflected in the URL.
    </p>
    <NCard size="small">
      <NMenu mode="horizontal" :value="activeKey" :options="menuOptions" class="nav-menu" />
    </NCard>
    <NCard size="small">
      <RouterView />
    </NCard>
  </div>
</template>
