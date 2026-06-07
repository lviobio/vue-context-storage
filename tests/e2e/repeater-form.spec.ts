import { test, expect } from '@playwright/test'

// Drives the dedicated e2e playground (vite.e2e.config.ts, served at :5174 under `/e2e/`).
const PAGE = '/e2e/repeater-form'

// Matches `items[0][product]=Apple` whether the brackets are raw or URL-encoded.
function itemFieldInUrl(index: number, field: string, value: string): RegExp {
  const b = (s: string) => `(?:%5B|\\[)${s}(?:%5D|\\])`
  return new RegExp(`items${b(String(index))}${b(field)}=${value}(&|$)`)
}

test.describe('repeater form (array of objects)', () => {
  test('adding an item and filling its fields serializes as items[n][field] in the URL', async ({
    page,
  }) => {
    await page.goto(PAGE)

    await page.getByTestId('add-item').click()
    await page.getByTestId('item-0-product').fill('Apple')
    await page.getByTestId('item-0-quantity').fill('5')

    await expect(page).toHaveURL(itemFieldInUrl(0, 'product', 'Apple'))
    await expect(page).toHaveURL(itemFieldInUrl(0, 'quantity', '5'))
  })

  test('multiple items are serialized with their own indices', async ({ page }) => {
    await page.goto(PAGE)

    await page.getByTestId('add-item').click()
    await page.getByTestId('item-0-product').fill('Apple')

    await page.getByTestId('add-item').click()
    await page.getByTestId('item-1-product').fill('Banana')
    await page.getByTestId('item-1-quantity').fill('3')

    await expect(page).toHaveURL(itemFieldInUrl(0, 'product', 'Apple'))
    await expect(page).toHaveURL(itemFieldInUrl(1, 'product', 'Banana'))
    await expect(page).toHaveURL(itemFieldInUrl(1, 'quantity', '3'))
  })

  test('items survive a page reload (URL → reactive state)', async ({ page }) => {
    await page.goto(PAGE)

    await page.getByTestId('add-item').click()
    await page.getByTestId('item-0-product').fill('Apple')
    await page.getByTestId('item-0-quantity').fill('5')
    await expect(page).toHaveURL(itemFieldInUrl(0, 'product', 'Apple'))

    await page.reload()

    // After reload the handler must rehydrate the repeater from the URL,
    // with quantity coerced back to a number by the schema.
    await expect(page.getByTestId('item-0-product')).toHaveValue('Apple')
    await expect(page.getByTestId('item-0-quantity')).toHaveValue('5')
    await expect(page.getByTestId('items-value')).toHaveText('[{"product":"Apple","quantity":5}]')
  })

  test('navigating directly to a URL with item params hydrates the form', async ({ page }) => {
    await page.goto(
      `${PAGE}?items%5B0%5D%5Bproduct%5D=Cherry&items%5B0%5D%5Bquantity%5D=7&title=Order`,
    )

    await expect(page.getByTestId('title')).toHaveValue('Order')
    await expect(page.getByTestId('item-0-product')).toHaveValue('Cherry')
    await expect(page.getByTestId('item-0-quantity')).toHaveValue('7')
  })

  test('removing an item reindexes the remaining items in the URL', async ({ page }) => {
    await page.goto(PAGE)

    await page.getByTestId('add-item').click()
    await page.getByTestId('item-0-product').fill('Apple')
    await page.getByTestId('add-item').click()
    await page.getByTestId('item-1-product').fill('Banana')
    await expect(page).toHaveURL(itemFieldInUrl(1, 'product', 'Banana'))

    await page.getByTestId('item-0-remove').click()

    // Banana shifts to index 0; no index-1 entry remains.
    await expect(page).toHaveURL(itemFieldInUrl(0, 'product', 'Banana'))
    await expect(page).not.toHaveURL(/items(?:%5B|\[)1(?:%5D|\])/)
    await expect(page.getByTestId('items-value')).toHaveText('[{"product":"Banana","quantity":1}]')
  })

  test('removing the last item clears item params from the URL', async ({ page }) => {
    await page.goto(PAGE)

    await page.getByTestId('add-item').click()
    await page.getByTestId('item-0-product').fill('Apple')
    await expect(page).toHaveURL(itemFieldInUrl(0, 'product', 'Apple'))

    await page.getByTestId('item-0-remove').click()

    await expect(page).not.toHaveURL(/items/)
    await expect(page.getByTestId('items-value')).toHaveText('[]')
  })
})
