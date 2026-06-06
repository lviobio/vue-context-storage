import { describe, expect, it } from 'vitest'
import { h } from 'vue'
import { mount } from '@vue/test-utils'
import { KeyedSlot } from '../../src/components/KeyedSlot'

describe('KeyedSlot', () => {
  it('renders its default slot without adding extra DOM', () => {
    const wrapper = mount(KeyedSlot, {
      slots: { default: () => h('span', { class: 'inner' }, 'content') },
    })
    expect(wrapper.find('span.inner').exists()).toBe(true)
    expect(wrapper.text()).toBe('content')
  })

  it('renders nothing when no slot is provided', () => {
    const wrapper = mount(KeyedSlot)
    expect(wrapper.text()).toBe('')
  })
})
