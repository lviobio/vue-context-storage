import { defineComponent } from 'vue'

/**
 * A renderless component that supports `key` prop.
 *
 * Vue Fragments don't support `:key` in render functions.
 * Use this component to force re-creation of slot content when `key` changes,
 * without adding any extra DOM elements.
 *
 * @example
 * ```ts
 * h(KeyedSlot, { key: someValue }, { default: () => slots.default?.() })
 * ```
 */
export const KeyedSlot = defineComponent({
  name: 'KeyedSlot',
  setup(_, { slots }) {
    return () => slots.default?.()
  },
})
