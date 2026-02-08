<script setup lang="ts">
import { reactive } from 'vue'
import {
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NButton,
  NAlert,
  NSwitch,
  NCode,
  NCollapse,
  NCollapseItem,
} from 'naive-ui'
import { useContextStorage } from '../../../../../src'

const settings = reactive({
  theme: 'light',
  fontSize: 14,
  sidebarOpen: true,
})

useContextStorage('localStorage', settings, {
  key: 'app-settings',
})

const userPrefs = reactive({
  language: 'en',
  notifications: true,
})

useContextStorage('localStorage', userPrefs, {
  key: 'user-preferences',
})

const reset = () => {
  localStorage.removeItem('app-settings')
  localStorage.removeItem('user-preferences')
  location.reload()
}

const exampleCode = `import { reactive } from 'vue'
import { useContextStorage } from 'vue-context-storage'

const settings = reactive({
  theme: 'light',
  fontSize: 14,
  sidebarOpen: true,
})

// Sync reactive data with localStorage
useContextStorage('localStorage', settings, {
  key: 'app-settings',
})

// Multiple storage keys supported
const userPrefs = reactive({
  language: 'en',
  notifications: true,
})

useContextStorage('localStorage', userPrefs, {
  key: 'user-preferences',
})`
</script>

<template>
  <h2 class="text-xl font-semibold mb-4">localStorage Handler Demo</h2>

  <NAlert type="info" class="mb-4">
    <NA
      :href="$router.resolve({ name: 'demo.local-storage' }).href"
      target="_blank"
      rel="noopener noreferrer"
      >Open this page</NA
    >
    in another tab to see cross-tab synchronization.
  </NAlert>

  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
    <div>
      <h3 class="text-lg font-medium mb-3">App Settings</h3>
      <p class="text-sm text-gray-500 mb-3">Storage key: <code>app-settings</code></p>
      <NForm label-placement="left" label-width="120">
        <NFormItem label="Theme">
          <NInput v-model:value="settings.theme" placeholder="light or dark" />
        </NFormItem>
        <NFormItem label="Font Size">
          <NInputNumber v-model:value="settings.fontSize" :min="10" :max="24" class="w-full" />
        </NFormItem>
        <NFormItem label="Sidebar Open">
          <NSwitch v-model:value="settings.sidebarOpen" />
        </NFormItem>
      </NForm>
      <code class="block mt-2 text-sm">{{ settings }}</code>
    </div>

    <div>
      <h3 class="text-lg font-medium mb-3">User Preferences</h3>
      <p class="text-sm text-gray-500 mb-3">Storage key: <code>user-preferences</code></p>
      <NForm label-placement="left" label-width="120">
        <NFormItem label="Language">
          <NInput v-model:value="userPrefs.language" placeholder="en, es, fr..." />
        </NFormItem>
        <NFormItem label="Notifications">
          <NSwitch v-model:value="userPrefs.notifications" />
        </NFormItem>
      </NForm>
      <code class="block mt-2 text-sm">{{ userPrefs }}</code>
    </div>
  </div>

  <div class="mb-6">
    <NButton type="warning" @click="reset"> Clear localStorage & Reload </NButton>
  </div>

  <NCollapse>
    <NCollapseItem title="Code Example" name="code">
      <NCode :code="exampleCode" language="typescript" word-wrap />
    </NCollapseItem>
  </NCollapse>
</template>
