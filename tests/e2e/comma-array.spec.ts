import { test, expect } from '@playwright/test'

// Drives the dedicated e2e playground (vite.e2e.config.ts, served at :5174 under
// `/e2e/`). Exercises the query handler's `serialize: { arrayFormat: 'comma' }`
// option: a flat array is written as a single comma-joined value and restored
// back into a real array (via the schema) on reload.
const PAGE = '/e2e/comma-array'

test.describe('comma array format', () => {
  test('a flat array serializes as a single comma-joined value', async ({ page }) => {
    await page.goto(PAGE)

    await page.getByTestId('set-ids').click()

    await expect(page).toHaveURL(/[?&]ids=1,2,3(&|$)/)
    await expect(page.getByTestId('ids-value')).toHaveText('1|2|3')
  })

  test('the comma array round-trips through a page reload (URL → numbers)', async ({ page }) => {
    await page.goto(PAGE)

    await page.getByTestId('set-ids').click()
    await expect(page).toHaveURL(/[?&]ids=1,2,3(&|$)/)

    await page.reload()

    // After reload the schema coercion must split "1,2,3" back into [1, 2, 3].
    await expect(page.getByTestId('ids-value')).toHaveText('1|2|3')
  })

  test('appending an item keeps the comma format', async ({ page }) => {
    await page.goto(PAGE)

    await page.getByTestId('set-ids').click()
    await page.getByTestId('add-id').click()

    await expect(page).toHaveURL(/[?&]ids=1,2,3,4(&|$)/)
    await expect(page.getByTestId('ids-value')).toHaveText('1|2|3|4')
  })

  test('a value that itself contains the separator is escaped and survives a reload', async ({
    page,
  }) => {
    await page.goto(PAGE)

    await page.getByTestId('set-tags').click()

    // The comma inside "with, comma" is backslash-escaped so it is not mistaken
    // for a delimiter. The decoded URL therefore contains "with\, comma".
    // %5C is the escaping backslash; spaces are encoded as '+'.
    await expect(page).toHaveURL(/tags=Some\+value,with%5C,\+comma,last/)
    await expect(page.getByTestId('tags-value')).toHaveText('Some value|with, comma|last')

    await page.reload()

    // After reload the escaped comma must be restored as part of the value,
    // keeping exactly three elements.
    await expect(page.getByTestId('tags-value')).toHaveText('Some value|with, comma|last')
  })
})
