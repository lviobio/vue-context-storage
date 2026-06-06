import { test, expect } from '@playwright/test'

// Drives the dedicated e2e playground (vite.e2e.config.ts, served at :5174 under
// `/e2e/`). Absolute URL used so it ignores the demo-playground `baseURL`.
const PAGE = '/e2e/query-sync'

test.describe('query synchronization', () => {
  test('typing into a field is reflected in the URL query', async ({ page }) => {
    await page.goto(PAGE)

    const name = page.getByPlaceholder('Enter name')
    await expect(name).toBeVisible()

    await name.fill('Alice')

    await expect(page).toHaveURL(/[?&]name=Alice(&|$)/)
  })

  test('query state survives a page reload (URL → reactive state)', async ({ page }) => {
    await page.goto(PAGE)

    const name = page.getByPlaceholder('Enter name')
    await name.fill('Alice')
    await expect(page).toHaveURL(/[?&]name=Alice(&|$)/)

    await page.reload()

    // After reload the handler must rehydrate the form from the URL.
    await expect(page.getByPlaceholder('Enter name')).toHaveValue('Alice')
  })

  test('a numeric field serializes as a number in the query', async ({ page }) => {
    await page.goto(PAGE)

    await page.getByRole('button', { name: 'Random number' }).click()

    await expect(page).toHaveURL(/[?&]number=\d+(&|$)/)
  })
})
