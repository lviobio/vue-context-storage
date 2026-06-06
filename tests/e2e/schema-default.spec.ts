import { test, expect } from '@playwright/test'

// Drives the dedicated e2e playground (vite.e2e.config.ts, served at :5174 under
// `/e2e/`). Absolute URL is used on purpose so it ignores the demo-playground
// `baseURL` configured in playwright.config.ts.
const PAGE = 'http://localhost:5174/e2e/schema-default'

// The fixture binds `{ page, search }` to the URL via a Zod schema where `page` has
// three independent default baselines:
//   - schema `.default(1)`                        → page=1 omitted
//   - schema `.meta({ additionalDefaultData: 5 })` → page=5 omitted
//   - option `additionalDefaultData: { page: 3 }` → page=3 omitted
// page=2 and page=4 must appear in the URL.
test.describe('schema default baselines (schema .default, schema meta, option-level)', () => {
  test('page=1 (schema .default) does not appear in the URL', async ({ page }) => {
    await page.goto(PAGE)

    await page.getByTestId('set-page-1').click()

    await expect(page.getByTestId('page-value')).toHaveText('1')
    await expect(page).not.toHaveURL(/filters(%5B|\[)page(%5D|\])/)
  })

  test('page=3 (option-level additionalDefaultData) does not appear in the URL', async ({
    page,
  }) => {
    await page.goto(PAGE)

    await page.getByTestId('set-page-3').click()

    await expect(page.getByTestId('page-value')).toHaveText('3')
    await expect(page).not.toHaveURL(/filters(%5B|\[)page(%5D|\])/)
  })

  test('page=5 (schema meta additionalDefaultData) does not appear in the URL', async ({
    page,
  }) => {
    await page.goto(PAGE)

    await page.getByTestId('set-page-5').click()

    await expect(page.getByTestId('page-value')).toHaveText('5')
    // Previously broken: the shallow merge dropped page=5 when option also
    // declared page=3, so page=5 would leak into the URL.
    await expect(page).not.toHaveURL(/filters(%5B|\[)page(%5D|\])/)
  })

  test('page=2 (non-default) appears in the URL', async ({ page }) => {
    await page.goto(PAGE)

    await page.getByTestId('set-page-2').click()

    await expect(page.getByTestId('page-value')).toHaveText('2')
    await expect(page).toHaveURL(/filters(%5B|\[)page(%5D|\])=2/)
  })

  test('page=4 (non-default) appears in the URL', async ({ page }) => {
    await page.goto(PAGE)

    await page.getByTestId('set-page-4').click()

    await expect(page.getByTestId('page-value')).toHaveText('4')
    await expect(page).toHaveURL(/filters(%5B|\[)page(%5D|\])=4/)
  })

  test('returning to a default baseline removes the param from the URL', async ({ page }) => {
    await page.goto(PAGE)

    await page.getByTestId('set-page-2').click()
    await expect(page).toHaveURL(/filters(%5B|\[)page(%5D|\])=2/)

    await page.getByTestId('set-page-1').click()
    await expect(page).not.toHaveURL(/filters(%5B|\[)page(%5D|\])/)
  })

  test('a non-default value survives a reload (URL → reactive state)', async ({ page }) => {
    await page.goto(PAGE)

    await page.getByTestId('set-page-2').click()
    await page.getByTestId('search').fill('hello')
    await expect(page).toHaveURL(/filters(%5B|\[)page(%5D|\])=2/)

    await page.reload()

    await expect(page.getByTestId('page-value')).toHaveText('2')
    await expect(page.getByTestId('search')).toHaveValue('hello')
  })
})
