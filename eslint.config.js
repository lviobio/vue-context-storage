import prettier from 'eslint-config-prettier'
import vue from 'eslint-plugin-vue'
import {
  configureVueProject,
  defineConfigWithVueTs,
  vueTsConfigs,
} from '@vue/eslint-config-typescript'

configureVueProject({
  scriptLangs: ['ts'],
})

export default defineConfigWithVueTs(
  vue.configs['flat/essential'],
  vueTsConfigs.recommended,
  {
    ignores: ['node_modules', 'dist', '*.log', 'coverage', 'playground/dist'],
  },
  {
    rules: {
      eqeqeq: 'error',
      "no-console": ["error", { "allow": ["warn", "error"] }],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      'vue/multi-word-component-names': 'off', // Allow single-word names in library
      'vue/component-definition-name-casing': ['error', 'PascalCase'],
      'vue/component-name-in-template-casing': [
        'error',
        'PascalCase',
        {
          registeredComponentsOnly: false,
        },
      ],
    },
  },
  prettier,
)
