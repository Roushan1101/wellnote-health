import { expect, test } from '@playwright/test'
import { demoDataset } from '../src/data/history'
import { closeSettings, importJson, openSettings, selectPair } from './helpers'

test.beforeEach(async ({ page }) => { await page.goto('./') })

test('overview is uncluttered while sample identity and complete history remain available', async ({ page }) => {
  await expect(page.locator('.demo-banner')).toHaveCount(0)
  await expect(page.locator('main .data-controls')).toHaveCount(0)
  await expect(page.locator('.report-picker')).toHaveCount(0)
  await expect(page.getByText('Use your own health journal', { exact: true })).toHaveCount(0)
  await expect(page.locator('.local-label')).toHaveText('Sample data')
  await expect(page.locator('.history-overview-panel [data-history-point]')).toHaveCount(4)
  await expect(page.locator('.sidebar-timeline .timeline-entry')).toHaveCount(4)
  await expect(page).toHaveTitle('Wellnote | Overview')
  expect((await page.locator('.sidebar').boundingBox())!.y).toBe(0)
  await selectPair(page)
  await expect(page.locator('.compact-pair-picker')).toBeVisible()
  await expect(page.locator('.sample-timeline')).toHaveCount(0)
  await page.getByRole('navigation').getByRole('button', { name: 'Comparison', exact: true }).click()
  await expect(page.locator('[data-comparison-report]')).toHaveCount(4)
})

test('Settings traps keyboard focus, closes with Escape and restores its trigger', async ({ page }) => {
  const trigger = page.getByRole('button', { name: 'Settings', exact: true })
  await trigger.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'Settings', exact: true })
  await expect(dialog).toBeVisible()
  await expect(page.getByRole('button', { name: 'Close Settings', exact: true })).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(page.getByRole('button', { name: 'Clear personal data / return to demo' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Close Settings', exact: true })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(trigger).toBeFocused()
})

test('successful import closes Settings and resets consent; invalid import remains actionable', async ({ page }) => {
  await openSettings(page)
  await expect(page.getByRole('checkbox', { name: /Remember the next import/ })).not.toBeChecked()
  await importJson(page, demoDataset)
  await expect(page.getByRole('dialog', { name: 'Settings', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeFocused()
  await expect(page.locator('.local-label')).toHaveText('Local import')
  await importJson(page, '{broken')
  await expect(page.getByRole('alert')).toContainText('invalid JSON')
  await expect(page.getByRole('checkbox', { name: /Remember the next import/ })).not.toBeChecked()
  await closeSettings(page)
  await expect(page.locator('.local-label')).toHaveText('Local import')
})

test('failed saved load and failed clearing retain visible recovery advice outside Settings', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem(`wellnote-local-dataset:v1:${location.pathname}`, 'broken'))
  await page.reload()
  await expect(page.locator('main [role="alert"]')).toContainText('Saved browser data could not be loaded')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('button', { name: 'Open Settings', exact: true }).click()
  await page.evaluate(() => { Storage.prototype.removeItem = () => { throw new Error('Unavailable') } })
  await page.getByRole('button', { name: 'Clear personal data / return to demo' }).click()
  await expect(page.locator('main [role="alert"]')).toContainText('browser storage could not be removed')
  await expect(page.locator('.local-label')).toHaveText('Sample data')
})

for (const width of [320, 390, 720]) {
  test(`Settings at ${width}px remains readable and keyboard-accessible without overflow`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await openSettings(page)
    const dialog = page.getByRole('dialog', { name: 'Settings', exact: true })
    expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
    for (const control of [page.getByRole('button', { name: 'Close Settings', exact: true }), page.locator('.import-label')]) {
      expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(44)
    }
    await page.keyboard.press('Escape')
    await selectPair(page)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect((await page.getByRole('combobox', { name: 'After report', exact: true }).boundingBox())!.height).toBeGreaterThanOrEqual(44)
  })
}
