<script setup lang="ts">
import { reactive } from 'vue'
import {
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NButton,
  NAlert,
  NCode,
  NCollapse,
  NCollapseItem,
} from 'naive-ui'
import { useContextStorage } from 'vue-context-storage'

const formDraft = reactive({
  email: '',
  message: '',
  step: 1,
})

useContextStorage('sessionStorage', formDraft, {
  key: 'contact-form-draft',
})

const wizardState = reactive({
  currentPage: 1,
  totalPages: 5,
  answers: [] as string[],
})

useContextStorage('sessionStorage', wizardState, {
  key: 'wizard-state',
})

function addAnswer() {
  wizardState.answers.push(`Answer ${wizardState.answers.length + 1}`)
}

const reset = () => {
  sessionStorage.removeItem('contact-form-draft')
  sessionStorage.removeItem('wizard-state')
  location.reload()
}

const exampleCode = `import { reactive } from 'vue'
import { useContextStorage } from 'vue-context-storage'

// Form draft - survives page refresh but not tab close
const formDraft = reactive({
  email: '',
  message: '',
  step: 1,
})

useContextStorage('sessionStorage', formDraft, {
  key: 'contact-form-draft',
})

// Wizard state with arrays
const wizardState = reactive({
  currentPage: 1,
  totalPages: 5,
  answers: [] as string[],
})

useContextStorage('sessionStorage', wizardState, {
  key: 'wizard-state',
})`
</script>

<template>
  <h2 class="text-xl font-semibold mb-4">sessionStorage Handler Demo</h2>

  <NAlert type="info" class="mb-4">
    Data is persisted to sessionStorage for this tab only. It will be cleared when the tab is
    closed, but survives page refreshes.
  </NAlert>

  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
    <div>
      <h3 class="text-lg font-medium mb-3">Form Draft</h3>
      <p class="text-sm text-gray-500 mb-3">Storage key: <code>contact-form-draft</code></p>
      <NForm label-placement="left" label-width="80">
        <NFormItem label="Email">
          <NInput v-model:value="formDraft.email" placeholder="your@email.com" />
        </NFormItem>
        <NFormItem label="Message">
          <NInput
            v-model:value="formDraft.message"
            type="textarea"
            placeholder="Your message..."
            :rows="3"
          />
        </NFormItem>
        <NFormItem label="Step">
          <NInputNumber v-model:value="formDraft.step" :min="1" :max="5" class="w-full" />
        </NFormItem>
      </NForm>
      <code class="block mt-2 text-sm">{{ formDraft }}</code>
    </div>

    <div>
      <h3 class="text-lg font-medium mb-3">Wizard State</h3>
      <p class="text-sm text-gray-500 mb-3">Storage key: <code>wizard-state</code></p>
      <NForm label-placement="left" label-width="100">
        <NFormItem label="Current Page">
          <NInputNumber
            v-model:value="wizardState.currentPage"
            :min="1"
            :max="wizardState.totalPages"
            class="w-full"
          />
        </NFormItem>
        <NFormItem label="Total Pages">
          <NInputNumber v-model:value="wizardState.totalPages" :min="1" :max="10" class="w-full" />
        </NFormItem>
        <NFormItem label="Answers">
          <div class="flex flex-col gap-2 w-full">
            <div v-for="(answer, i) in wizardState.answers" :key="i" class="text-sm">
              {{ i + 1 }}. {{ answer }}
            </div>
            <NButton size="small" @click="addAnswer">Add Answer</NButton>
          </div>
        </NFormItem>
      </NForm>
      <code class="block mt-2 text-sm">{{ wizardState }}</code>
    </div>
  </div>

  <div class="mb-6">
    <NButton type="warning" @click="reset"> Clear sessionStorage & Reload </NButton>
  </div>

  <NCollapse>
    <NCollapseItem title="Code Example" name="code">
      <NCode :code="exampleCode" language="typescript" word-wrap />
    </NCollapseItem>
  </NCollapse>
</template>
