<script setup lang="ts">
import { ref } from 'vue'
import { NFormItem, NRadioGroup, NRadioButton } from 'naive-ui'
import RepeaterForm from './RepeaterForm.vue'
import { useContextStorage } from 'vue-context-storage'

const onlyChanges = ref(true)
const transformMethod = ref<'manual' | 'schema'>('schema')
const codeExpanded = ref(false)

useContextStorage(
  'sessionStorage',
  ref({
    onlyChanges,
    transformMethod,
    codeExpanded,
  }),
  {
    key: 'query-demo-repeater',
  },
)
</script>

<template>
  <div class="flex flex-wrap gap-x-8 gap-y-2 mb-4">
    <NFormItem label="Sync only changed values" label-placement="left">
      <NSwitch v-model:value="onlyChanges" />
    </NFormItem>

    <NFormItem label="Transform method" label-placement="left">
      <NRadioGroup v-model:value="transformMethod" size="small">
        <NRadioButton value="manual">Manual</NRadioButton>
        <NRadioButton value="schema">Schema (Zod)</NRadioButton>
      </NRadioGroup>
    </NFormItem>
  </div>

  <RepeaterForm
    :only-changes="onlyChanges"
    :transform-method="transformMethod"
    v-model:code-expanded="codeExpanded"
    :key="`${onlyChanges}-${transformMethod}`"
  />
</template>
