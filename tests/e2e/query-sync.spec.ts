import { test, expect } from '@playwright/test'

// The "Different types" demo binds a reactive form to the URL query via the
// query handler. These tests drive the real playground in a browser and assert
// on the actual address bar — the core promise of the library.
const PAGE = '/app/query/different-types'

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
