import { test, expect } from '@playwright/test'

// Drives the dedicated e2e playground (vite.e2e.config.ts, served at :5174 under `/e2e/`).
const PAGE = '/e2e/nested-default'

// `filters` is a nested object whose default is declared only at the object level
// (`.default({ page: 1, sort: 'asc' })`), with no field-level defaults inside.
// The value matching that default must be treated as a baseline and omitted from
// the URL, just like a flat schema default.
test.describe('nested object default baseline (object-level .default())', () => {
  test('filters matching the object-level schema default does not appear in the URL', async ({
    page,
  }) => {
    await page.goto(PAGE)

    await page.getByTestId('set-default').click()

    await expect(page.getByTestId('filters-value')).toHaveText('{"page":1,"sort":"asc"}')
    // page=1 & sort=asc match the nested object-level default → must be omitted.
    await expect(page).not.toHaveURL(/filters/)
  })

  test('a non-default nested value appears in the URL', async ({ page }) => {
    await page.goto(PAGE)

    await page.getByTestId('set-custom').click()

    await expect(page.getByTestId('filters-value')).toHaveText('{"page":2,"sort":"desc"}')
    await expect(page).toHaveURL(/q(%5B|\[)filters(%5D|\])(%5B|\[)page(%5D|\])=2/)
  })
})
