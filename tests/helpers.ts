import { expect, type Page } from '@playwright/test'

export async function openSettings(page: Page) {
  if (!await page.getByRole('dialog', { name: 'Settings', exact: true }).isVisible()) {
    await page.getByRole('button', { name: 'Settings', exact: true }).click()
  }
}

export async function closeSettings(page: Page) {
  if (await page.getByRole('dialog', { name: 'Settings', exact: true }).isVisible()) {
    await page.getByRole('button', { name: 'Close Settings', exact: true }).click()
  }
}

export async function importJson(page: Page, value: unknown, name = 'fictional-import.json') {
  await openSettings(page)
  await page.getByLabel('Load my health data', { exact: true }).setInputFiles({
    name, mimeType: 'application/json', buffer: Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)),
  })
  await expect(async () => {
    expect(!await page.getByRole('dialog', { name: 'Settings', exact: true }).isVisible()
      || await page.locator('.settings-dialog .import-error').isVisible()).toBe(true)
  }).toPass()
}

export async function selectPair(page: Page, before?: string, after?: string) {
  await page.getByRole('navigation').getByRole('button', { name: 'Biomarkers', exact: true }).click()
  if (after) await page.getByRole('combobox', { name: 'After report', exact: true }).selectOption(after)
  if (before) await page.getByRole('combobox', { name: 'Before report', exact: true }).selectOption(before)
}
