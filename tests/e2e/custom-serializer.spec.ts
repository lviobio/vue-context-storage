import { test, expect } from '@playwright/test'

// Drives the dedicated e2e playground (vite.e2e.config.ts, served at :5174 under
// `/e2e/`). The view nests its own <ContextStorage> with a JSON-based custom
// `serializer`, so the whole registration is encoded as one JSON value under its
// key — proving the `createQueryHandler({ serializer })` hook works end-to-end.
const PAGE = '/e2e/custom-serializer'

test.describe('custom serializer', () => {
  test('state is written to the URL using the custom JSON format', async ({ page }) => {
    await page.goto(PAGE)

    await page.getByTestId('set-ids').click()
    await page.getByPlaceholder('query').fill('hello')

    // The custom serializer encodes { ids, q } as a single JSON value under `f`.
    await expect(page).toHaveURL(/[?&]f=/)
    await expect.poll(() => new URL(page.url()).searchParams.get('f')).toBe(
      '{"ids":[1,2,3],"q":"hello"}',
    )
  })

  test('the custom format round-trips through a page reload', async ({ page }) => {
    await page.goto(PAGE)

    await page.getByTestId('set-ids').click()
    await page.getByPlaceholder('query').fill('hello')
    await expect.poll(() => new URL(page.url()).searchParams.get('f')).toBe(
      '{"ids":[1,2,3],"q":"hello"}',
    )

    await page.reload()

    // The custom deserializer + schema must rehydrate the form from the JSON value.
    await expect(page.getByTestId('ids-value')).toHaveText('1|2|3')
    await expect(page.getByPlaceholder('query')).toHaveValue('hello')
  })
})
