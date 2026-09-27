import { expect, test } from '@playwright/test'
import { importJson, openSettings, closeSettings } from './helpers'
import { demoDataset } from '../src/lib/dataset'
import { markers } from '../src/data/markers'
import { person, reports } from '../src/data/reports'
import type { LegacyDataset } from '../src/types'

// Entirely fictional fixtures; no personal source files are read by these tests.
function importedFixture(): LegacyDataset {
  const data: LegacyDataset = structuredClone({ schemaVersion: 1, markers, person, reports })
  data.person = { name: 'Taylor Example (test fixture)', initials: 'TE', firstName: 'Taylor', latestReportedAge: 36, reportedSex: 'Not specified' }
  data.reports = {
    earlier: { id: 'example-a', date: '2021-03-09', label: '9 Mar 2021', shortDate: '9 Mar 2021', fullDate: '9 March 2021', year: 2021, pages: 12, filename: 'fictional-a.pdf', age: 35 },
    latest: { id: 'example-b', date: '2022-03-09', label: '9 Mar 2022', shortDate: '9 Mar 2022', fullDate: '9 March 2022', year: 2022, pages: 12, filename: 'fictional-b.pdf', age: 36 },
  }
  const latest: Record<string, string> = { 'vitamin-d': '42', lymphocytes: '31', 'total-cholesterol': '190', ldl: '90', 'non-hdl': '120', ggt: '73' }
  for (const marker of data.markers) {
    delete marker.note
    for (const reading of [marker.earlier, marker.latest]) {
      if (reading) { reading.sourceLabel = 'Invented local test fixture'; reading.page = 2 }
    }
    if (marker.latest && latest[marker.id]) marker.latest.raw = latest[marker.id]!
  }
  data.markers.push({
    id: 'extra-test-marker', name: 'Additional invented marker', group: 'kidney', priority: 500, unit: 'example',
    earlier: { raw: '2', sourceLabel: 'Invented test', reference: { kind: 'context', label: 'Unscored example' } },
    latest: { raw: '3', sourceLabel: 'Invented test', reference: { kind: 'context', label: 'Unscored example' } },
  })
  return data
}

test.beforeEach(async ({ page }) => { await page.goto('./') })

test('memory-only import updates every view without requests or persistence', async ({ page }) => {
  await openSettings(page)
  await expect(page.getByRole('checkbox', { name: /Remember the next import/ })).not.toBeChecked()
  await page.waitForLoadState('networkidle')
  const requests: string[] = []
  page.on('request', (request) => requests.push(request.url()))
  await importJson(page, importedFixture())
  await expect(page.locator('.profile-info')).toContainText('Taylor Example')
  await expect(page.locator('.local-label')).toHaveText('Local import')
  await openSettings(page)
  await expect(page.locator('.data-controls')).toContainText('memory only')
  await closeSettings(page)
  await expect(page.locator('.results-meta')).toContainText('26 of 26')
  await expect(page.locator('.report-date-pair')).toContainText('9 Mar 2021')
  await expect(page.locator('.priority-card')).not.toContainText('Below')
  expect(await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith('wellnote-local-dataset:')))).toEqual([])
  await page.getByRole('navigation').getByRole('button', { name: /Your next steps/ }).click()
  await expect(page.locator('.guidance-card')).toHaveCount(2)
  await expect(page.locator('.guidance-liver .guidance-summary')).toContainText('GGT: 73 U/L (high)')
  await expect(page.locator('.guidance-list')).not.toContainText('fictional')
  await page.getByRole('navigation').getByRole('button', { name: /Source reports/ }).click()
  await expect(page.locator('.report-cards')).toContainText('9 March 2022')
  await expect(page.locator('.report-cards')).toContainText('no original PDF attached')
  await expect(page.locator('a[href*=".pdf"]')).toHaveCount(0)
  expect(requests).toEqual([])
  await page.reload()
  await expect(page.locator('.profile-info')).toContainText('RK')
  await expect(page.locator('.local-label')).toHaveText('Sample data')
})

test('remember requires explicit consent and clear removes saved data', async ({ page }) => {
  await openSettings(page)
  await page.getByRole('checkbox', { name: /Remember the next import/ }).check()
  await importJson(page, importedFixture())
  await openSettings(page)
  await expect(page.locator('.data-controls')).toContainText('saved only in this browser')
  await page.reload()
  await expect(page.locator('.profile-info')).toContainText('Taylor Example')
  await openSettings(page)
  await page.getByRole('button', { name: 'Clear personal data / return to demo' }).click()
  await expect(page.locator('.profile-info')).toContainText('RK')
  expect(await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith('wellnote-local-dataset:')))).toEqual([])
  await page.reload()
  await expect(page.locator('.profile-info')).toContainText('RK')
})

test('loading without remember also removes a previously saved dataset', async ({ page }) => {
  await openSettings(page)
  await page.getByRole('checkbox', { name: /Remember the next import/ }).check()
  await importJson(page, importedFixture())
  await openSettings(page)
  await expect(page.locator('.data-controls')).toContainText('saved only in this browser')
  await expect(page.getByRole('checkbox', { name: /Remember the next import/ })).not.toBeChecked()
  await importJson(page, importedFixture())
  await openSettings(page)
  await expect(page.locator('.data-controls')).toContainText('memory only')
  await page.reload()
  await expect(page.locator('.profile-info')).toContainText('RK')
})

test('invalid input is actionable and preserves the current dataset', async ({ page }) => {
  await importJson(page, importedFixture())
  const invalid = importedFixture()
  invalid.markers.push(invalid.markers[0]!)
  await importJson(page, invalid)
  await expect(page.getByRole('alert')).toContainText('duplicate ID')
  await expect(page.locator('.profile-info')).toContainText('Taylor Example')
  await importJson(page, '{broken')
  await expect(page.getByRole('alert')).toContainText('invalid JSON')
  await importJson(page, 'not-a-json-file', 'fictional.pdf')
  await expect(page.getByRole('alert')).toContainText('PDF reports cannot be imported')
})

test('imported dates, source pages, missing samples, CSV and print use live data', async ({ page }) => {
  await importJson(page, importedFixture())
  await page.getByRole('textbox', { name: 'Search biomarkers' }).fill('magnesium')
  await page.getByRole('button', { name: 'Details for Magnesium' }).click()
  await expect(page.getByRole('dialog')).toContainText('Not reported on 9 Mar 2021')
  await expect(page.getByRole('dialog')).toContainText('source page 2 (not attached)')
  await expect(page.getByRole('dialog')).not.toContainText('Synthetic fixture')
  await page.getByRole('button', { name: 'Close biomarker details' }).click()
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export comparison' }).click()
  const stream = await (await pending).createReadStream()
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(Buffer.from(chunk))
  const csv = Buffer.concat(chunks).toString()
  expect(csv).toContain('2021-03-09 result')
  expect(csv).toContain('PERSONAL LOCAL IMPORT')
  expect(csv).not.toContain('SYNTHETIC DEMO')
  await page.emulateMedia({ media: 'print' })
  await expect(page.locator('.print-report')).toContainText('PRIVATE HEALTH DATA')
  await expect(page.locator('.print-report')).toContainText('9 March 2022')
  await expect(page.locator('.print-report table tbody tr')).toHaveCount(1)
})

test('no guidance plan is invented for unflagged or absent optional markers', async ({ page }) => {
  const data = importedFixture()
  data.markers = data.markers.filter((marker) => marker.id !== 'alt')
  data.markers.find((marker) => marker.id === 'ggt')!.latest!.raw = '33'
  data.markers.find((marker) => marker.id === 'hba1c')!.latest!.raw = '5.1'
  await importJson(page, data)
  await page.getByRole('navigation').getByRole('button', { name: /Your next steps/ }).click()
  await expect(page.locator('.guidance-card')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'No matching educational topics' })).toBeVisible()
})

test('production CSP blocks connection requests and renders imported text safely', async ({ page }) => {
  await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveAttribute('content', /connect-src 'none'/)
  const data = importedFixture()
  data.person.name = '<b>Invented plain text</b>'
  await importJson(page, data)
  await expect(page.locator('.profile-info')).toContainText('<b>Invented plain text</b>')
  await expect(page.locator('.profile-info b')).toHaveCount(0)
  const blocked = await page.evaluate(async () => {
    try { await fetch('./index.html?connection-policy-check'); return false } catch { return true }
  })
  expect(blocked).toBe(true)
})

test('invalid saved data fails closed to demo with recovery advice', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem(`wellnote-local-dataset:v1:${location.pathname}`, '{"schemaVersion":99}'))
  await page.reload()
  await expect(page.locator('.profile-info')).toContainText('RK')
  await expect(page.getByRole('alert')).toContainText('Saved browser data could not be loaded')
  await openSettings(page)
  await page.getByRole('button', { name: 'Clear personal data / return to demo' }).click()
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('storage failures are explained and memory-only import remains available', async ({ page }) => {
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException('Storage unavailable', 'QuotaExceededError') } })
  await openSettings(page)
  await page.getByRole('checkbox', { name: /Remember the next import/ }).check()
  await importJson(page, importedFixture())
  await expect(page.getByRole('alert')).toContainText('Browser storage could not be updated')
  await expect(page.locator('.profile-info')).toContainText('RK')
  await page.getByRole('checkbox', { name: /Remember the next import/ }).uncheck()
  await importJson(page, importedFixture())
  await expect(page.locator('.profile-info')).toContainText('Taylor Example')
  await openSettings(page)
  await expect(page.locator('.data-controls')).toContainText('memory only')
})

test('template download always contains only synthetic defaults, even after personal import', async ({ page }) => {
  await importJson(page, importedFixture())
  await openSettings(page)
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download JSON template' }).click()
  const stream = await (await pending).createReadStream()
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(Buffer.from(chunk))
  const json = JSON.parse(Buffer.concat(chunks).toString())
  expect(json).toEqual(demoDataset)
})
