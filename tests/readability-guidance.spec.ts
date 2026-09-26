import { expect, test } from '@playwright/test'
import { demoDataset } from '../src/data/history'
import { nutrientGuidance } from '../src/data/nutrient-guidance'
import type { Dataset } from '../src/types'

test('RK is the default display name without implying the samples are real', async ({ page }) => {
  await page.goto('./')
  await expect(page.locator('.profile-info')).toContainText('RK')
  await expect(page.locator('.avatar')).toHaveText('RK')
  await expect(page.locator('body')).not.toContainText('Alex Morgan')
  await expect(page.locator('.demo-banner')).toContainText('PUBLIC DEMO')
  await expect(page.locator('.demo-banner')).toContainText('fictional')
})

test('low nutrient guidance has three foods and two alternatives, never replacement for a high result', async ({ page }) => {
  const data: Dataset = structuredClone(demoDataset)
  data.markers = nutrientGuidance.map((plan) => ({
    id: plan.id, name: `Synthetic ${plan.id}`, group: plan.group, priority: 10, unit: 'fictional units',
    readings: Object.fromEntries(data.reports.map((report, index) => [report.id, {
      raw: index === data.reports.length - 1 ? '5' : '25',
      reference: { kind: 'numeric', min: 10, max: 20, label: '10 to 20 (invented reference)' },
      sourceLabel: 'Invented education fixture',
    }])),
  }))
  await page.goto('./')
  await page.getByLabel('Load my health data', { exact: true }).setInputFiles({
    name: 'synthetic-nutrient-education.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(data)),
  })
  await page.getByRole('navigation').getByRole('button', { name: /Your next steps/ }).click()
  await expect(page.locator('.medication-options')).toHaveCount(5)
  for (const plan of nutrientGuidance) {
    const card = page.locator(`.guidance-${plan.id}`)
    await expect(card.locator('.everyday-guidance > ul').first().locator('li')).toHaveCount(3)
    await expect(card.locator('.medication-options li')).toHaveCount(2)
    await expect(card.locator('.medication-options')).toContainText('not a confirmed deficiency')
    await expect(card.locator('.medication-options')).toContainText('alternatives')
  }
  await page.getByRole('combobox', { name: 'After report', exact: true }).selectOption(data.reports[1]!.id)
  await expect(page.locator('.medication-options')).toHaveCount(0)
  await expect(page.locator('.guide-intro')).toContainText('Historical selection')
  await expect(page.locator('.guidance-list')).not.toContainText('Ferrous sulfate')
  await expect(page.locator('.guidance-list')).not.toContainText('Hydroxocobalamin')
  await expect(page.locator('.guidance-list')).toContainText('No replacement medication is suggested')
})

for (const width of [320, 390, 720]) {
  test(`mobile ${width}px has readable text and usable touch targets without page overflow`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('./')
    for (const selector of ['.data-controls p', '.report-picker p', '.search-field input', '.marker-name-button strong']) {
      expect(await page.locator(selector).first().evaluate((element) => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(16)
    }
    for (const selector of ['.eyebrow', '.results-note', '.results-meta', '.marker-name-button small', '.status-badge']) {
      expect(await page.locator(selector).first().evaluate((element) => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(14)
    }
    for (const control of [page.getByRole('combobox', { name: 'Before report', exact: true }), page.getByRole('button', { name: 'Export comparison', exact: true })]) {
      expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(44)
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.getByRole('button', { name: 'Details for Vitamin D', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    expect(await page.getByRole('dialog').evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
    expect(await page.locator('.dialog-content p').first().evaluate((element) => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(14)
    expect((await page.getByRole('button', { name: 'Close biomarker details' }).boundingBox())!.height).toBeGreaterThanOrEqual(44)
    await page.keyboard.press('Escape')
    await page.getByRole('navigation').getByRole('button', { name: /Your next steps/ }).click()
    expect(await page.locator('.guidance-columns li').first().evaluate((element) => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(16)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.getByRole('navigation').getByRole('button', { name: /Source reports/ }).click()
    expect(await page.locator('.report-metadata dd').first().evaluate((element) => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(16)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}
