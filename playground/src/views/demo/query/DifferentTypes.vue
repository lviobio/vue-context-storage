<script setup lang="ts">
import { ref } from 'vue'
import { NFormItem } from 'naive-ui'
import DifferentTypesForm from './DifferentTypesForm.vue'
import { useContextStorage } from '../../../../../src'

const onlyChanges = ref(true)

useContextStorage(
  'sessionStorage',
  ref({
    onlyChanges,
  }),
  {
    key: 'query-demo-simple-form',
  },
)
</script>

<template>
  <NFormItem label="Sync only changed values" label-placement="left">
    <NSwitch v-model:value="onlyChanges" />
  </NFormItem>

  <DifferentTypesForm :only-changes="onlyChanges" :key="`only-changes-${onlyChanges}`" />
</template>
