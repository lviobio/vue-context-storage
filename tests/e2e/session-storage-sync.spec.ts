import { test, expect, type Page } from '@playwright/test'

// Drives the dedicated e2e playground (vite.e2e.config.ts, served at :5174 under
// `/e2e/`). Absolute URL used so it ignores the demo-playground `baseURL`.
const PAGE = '/e2e/session-storage-sync'
const KEY = 'e2e-session-sync'

/**
 * Emulates a manual edit in the DevTools Application panel: the write goes
 * through CDP's DOMStorage domain (the same path DevTools uses), so the page
 * receives a real `storage` event. A same-page `sessionStorage.setItem()`
 * call would NOT fire the event in that page, per spec.
 */
async function devtoolsSetItem(
  page: Page,
  options: { isLocalStorage: boolean; key: string; value: string },
): Promise<void> {
  const client = await page.context().newCDPSession(page)
  try {
    await client.send('DOMStorage.enable')
    const { frameTree } = await client.send('Page.getFrameTree')
    const { storageKey } = await client.send('Storage.getStorageKeyForFrame', {
      frameId: frameTree.frame.id,
    })
    await client.send('DOMStorage.setDOMStorageItem', {
      storageId: { storageKey, isLocalStorage: options.isLocalStorage },
      key: options.key,
      value: options.value,
    })
  } finally {
    await client.detach()
  }
}

test.describe('sessionStorage synchronization', () => {
  test('typing into a field is persisted to sessionStorage', async ({ page }) => {
    await page.goto(PAGE)

    const name = page.getByTestId('session-name')
    await expect(name).toBeVisible()

    await name.fill('Alice')

    await expect
      .poll(() => page.evaluate((key) => sessionStorage.getItem(key), KEY))
      .toContain('"name":"Alice"')
  })

  test('sessionStorage state survives a page reload (storage → reactive state)', async ({
    page,
  }) => {
    await page.goto(PAGE)

    await page.getByTestId('session-name').fill('Alice')
    await page.getByTestId('session-increment').click()
    await expect(page.getByTestId('session-count')).toHaveText('1')

    await page.reload()

    // After reload the handler must rehydrate the form from sessionStorage.
    await expect(page.getByTestId('session-name')).toHaveValue('Alice')
    await expect(page.getByTestId('session-count')).toHaveText('1')
  })

  test('a manual DevTools edit of sessionStorage is reflected immediately (no reload)', async ({
    page,
  }) => {
    await page.goto(PAGE)
    await expect(page.getByTestId('session-name')).toHaveValue('John')

    await devtoolsSetItem(page, {
      isLocalStorage: false,
      key: KEY,
      value: JSON.stringify({ name: 'FromDevTools', count: 42 }),
    })

    // No page.reload() here — the handler must pick the change up via the
    // `storage` event that the external (DevTools/CDP) write dispatches.
    await expect(page.getByTestId('session-name')).toHaveValue('FromDevTools')
    await expect(page.getByTestId('session-count')).toHaveText('42')
  })

  test('a localStorage edit with the same key does not bleed into the sessionStorage form', async ({
    page,
  }) => {
    await page.goto(PAGE)

    await devtoolsSetItem(page, {
      isLocalStorage: true,
      key: KEY,
      value: JSON.stringify({ name: 'LocalEdited', count: 7 }),
    })

    // The localStorage-bound control reacts...
    await expect(page.getByTestId('local-name')).toHaveText('LocalEdited')

    // ...while the sessionStorage-bound form (same storage key) stays intact.
    await expect(page.getByTestId('session-name')).toHaveValue('John')
    await expect(page.getByTestId('session-count')).toHaveText('0')
  })
})
