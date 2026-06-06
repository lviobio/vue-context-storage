import { describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { KeyedSlot } from '../../src/components/KeyedSlot'

function makeTrackedChild(counts: { mounted: number; unmounted: number }) {
  return defineComponent({
    name: 'TrackedChild',
    setup() {
      onMounted(() => counts.mounted++)
      onUnmounted(() => counts.unmounted++)
      return () => h('span', 'child')
    },
  })
}

describe('KeyedSlot', () => {
  it('renders its default slot without adding extra DOM elements', () => {
    const wrapper = mount(KeyedSlot, {
      slots: { default: () => h('span', { class: 'inner' }, 'content') },
    })
    expect(wrapper.find('span.inner').exists()).toBe(true)
    expect(wrapper.text()).toBe('content')
    // No wrapping div, span, or any other element injected by KeyedSlot itself
    expect(wrapper.html()).not.toContain('<div')
  })

  it('renders nothing when no slot is provided', () => {
    const wrapper = mount(KeyedSlot)
    expect(wrapper.text()).toBe('')
  })

  it('remounts slot content when key changes (the use case: ContextStoragePrefix re-keying)', async () => {
    // ContextStoragePrefix renders: h(KeyedSlot, { key: segmentKey.value }, slots)
    // When the prefix name changes, segmentKey changes → Vue destroys the old
    // KeyedSlot instance and creates a new one → slot children are fully remounted
    // so they re-register themselves with the new prefix.
    const counts = { mounted: 0, unmounted: 0 }
    const TrackedChild = makeTrackedChild(counts)
    const keyRef = ref('segment-a')

    const Parent = defineComponent({
      setup() {
        return () => h(KeyedSlot, { key: keyRef.value }, { default: () => h(TrackedChild) })
      },
    })

    mount(Parent)
    expect(counts.mounted).toBe(1)
    expect(counts.unmounted).toBe(0)

    keyRef.value = 'segment-b'
    await nextTick()

    // Old KeyedSlot destroyed, new one created → child fully remounted.
    expect(counts.unmounted).toBe(1)
    expect(counts.mounted).toBe(2)
  })

  it('a keyed DOM element also remounts content but pollutes the DOM — this is why KeyedSlot is needed', async () => {
    // To force remount without KeyedSlot one would have to wrap children in a
    // real element and put the key there.  The remount works, but the wrapper
    // element stays in the DOM — unacceptable for a renderless component.
    const counts = { mounted: 0, unmounted: 0 }
    const TrackedChild = makeTrackedChild(counts)
    const keyRef = ref('segment-a')

    const Parent = defineComponent({
      setup() {
        return () => h('div', { key: keyRef.value }, [h(TrackedChild)])
      },
    })

    const wrapper = mount(Parent)
    expect(counts.mounted).toBe(1)

    keyRef.value = 'segment-b'
    await nextTick()

    // Remount happens — the key mechanism works with a real element...
    expect(counts.unmounted).toBe(1)
    expect(counts.mounted).toBe(2)

    // ...but it introduces an unwanted <div> into the rendered output.
    // KeyedSlot achieves exactly the same remount effect with zero DOM overhead.
    expect(wrapper.element.tagName).toBe('DIV')
  })
})
