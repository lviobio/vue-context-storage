<script setup lang="ts">
import { ref } from 'vue'
import { useContextStorage } from '../../../../../src'
import { useRouter } from 'vue-router'

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
]
const activeKey = ref(menuOptions[0].key)

function handleUpdateActiveKey(key: string): void {
  activeKey.value = key
  router.push(menuOptions.find((option) => option.key === key)!.route)
}

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
      <NMenu
        mode="horizontal"
        :value="activeKey"
        @update:value="handleUpdateActiveKey"
        :options="menuOptions"
        class="nav-menu"
      />
    </NCard>
    <NCard size="small">
      <RouterView />
    </NCard>
  </div>
</template>
