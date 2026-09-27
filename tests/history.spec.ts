import { expect, test, type Page } from '@playwright/test'
import { demoDataset } from '../src/data/history'
import { projectDataset } from '../src/lib/history'
import { markers } from '../src/data/markers'
import { person, reports } from '../src/data/reports'
import { importJson, openSettings, selectPair } from './helpers'

async function importData(page: Page, dataset: unknown) {
  await importJson(page, dataset, 'fictional-history.json')
}

test.beforeEach(async ({ page }) => { await page.goto('./') })

for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) {
  test(`compares fictional sample pair ${a + 1} and ${b + 1}`, async ({ page }) => {
    const before = demoDataset.reports[a]!
    const after = demoDataset.reports[b]!
    const expected = projectDataset(demoDataset, before.id, after.id)
    await selectPair(page, before.id, after.id)
    await expect(page.locator('.results-meta')).toContainText(`${expected.markers.length} of ${expected.markers.length}`)
    await expect(page.locator('.results-table thead')).toContainText(before.id)
    await expect(page.locator('.results-table thead')).toContainText(after.id)
    await page.getByRole('combobox', { name: 'Rows per page' }).selectOption({ label: 'All' })
    await expect(page.locator('.results-table tbody tr')).toHaveCount(expected.markers.length)
    await expect(page.locator('.report-date-pair')).toContainText(`Collected ${before.shortDate}`)
    await page.getByRole('navigation').getByRole('button', { name: /Your next steps/ }).click()
    await expect(page.locator('.guide-intro')).toContainText(after.shortDate)
    if (b < 3) await expect(page.locator('.guide-intro')).toContainText('Historical selection')
  })
}

test('reorders reversed pair choices and snapshots every report', async ({ page }) => {
  await selectPair(page, undefined, 'demo-spring')
  await page.getByRole('combobox', { name: 'Before report', exact: true }).selectOption('demo-latest')
  await expect(page.getByRole('combobox', { name: 'Before report', exact: true })).toHaveValue('demo-spring')
  await expect(page.getByRole('combobox', { name: 'After report', exact: true })).toHaveValue('demo-latest')
  for (const report of demoDataset.reports) {
    await page.getByRole('button', { name: new RegExp(`^Open snapshot .*${report.id}$`) }).click()
    await expect(page.locator('.results-table thead')).toContainText(report.id)
    await expect(page.locator('.results-table thead')).not.toContainText('CHANGE')
  }
})

test('unit mismatches disable changes/charts and preserve normalized-source provenance', async ({ page }) => {
  await selectPair(page, undefined, 'demo-spring')
  await page.getByRole('navigation').getByRole('button', { name: 'Overview', exact: true }).click()
  await page.getByRole('button', { name: 'Nutrients', exact: true }).click()
  await expect(page.locator('.comparison-rows')).toContainText('Units differ')
  await page.getByRole('textbox', { name: 'Search biomarkers' }).fill('iron')
  await expect(page.locator('.results-table')).toContainText('µg/dL')
  await expect(page.locator('.results-table')).toContainText('µmol/L')
  await expect(page.locator('.change-cell')).toContainText('Units differ')
  await page.getByRole('button', { name: 'Details for Serum iron' }).click()
  await expect(page.getByRole('dialog')).toContainText('Comparison disabled; no automatic unit conversion')
  await page.getByRole('button', { name: 'Close biomarker details' }).click()
  await selectPair(page, undefined, 'demo-autumn')
  await page.getByRole('textbox', { name: 'Search biomarkers' }).fill('platelets')
  await page.getByRole('button', { name: 'Details for Platelets' }).click()
  await expect(page.locator('.source-original')).toContainText('2.4 10⁵/µL')
  await expect(page.locator('.detail-value').last()).toContainText('240')
  await expect(page.locator('.reading-note')).toContainText('explicitly normalized')
})

test('sparse history without chart IDs has usable empty states and excludes absent pair rows', async ({ page }) => {
  const data = structuredClone(demoDataset)
  data.markers = [{
    id: 'custom-example', name: 'Custom example', group: 'kidney', unit: 'units', priority: 100,
    readings: { 'demo-spring': { raw: '2', sourceLabel: 'Synthetic sparse test', reference: { kind: 'numeric', label: '1–3', min: 1, max: 3 } } },
  }]
  await importData(page, data)
  await expect(page.locator('.comparison-panel')).toContainText('No lipids measurements')
  await expect(page.getByRole('heading', { name: 'No matching biomarkers' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Export comparison' })).toBeDisabled()
  await selectPair(page)
  await expect(page.locator('.report-picker')).toContainText('1 of 1 measurements are unavailable')
  await selectPair(page, undefined, 'demo-spring')
  await expect(page.locator('.results-table tbody tr')).toHaveCount(1)
  await page.getByRole('button', { name: 'Details for Custom example' }).click()
  await expect(page.getByRole('dialog')).toContainText('Not reported')
})

test('same-day labs retain separate IDs and sampling time, not reported dates', async ({ page }) => {
  const data = structuredClone(demoDataset)
  data.reports[1]!.date = data.reports[0]!.date
  data.reports[1]!.collectionDate = data.reports[0]!.date
  data.reports[1]!.reportedDate = '2024-02-18'
  data.reports[1]!.label = 'Old label must not control timeline'
  await importData(page, data)
  await selectPair(page, undefined, 'demo-spring')
  await expect(page.locator('.report-date-pair')).toContainText('Collected 14 Feb 2024 · 11:20 AM')
  await expect(page.locator('.report-date-pair')).not.toContainText('18 Feb')
  await expect(page.locator('.results-table thead')).toContainText('demo-baseline')
  await expect(page.locator('.results-table thead')).toContainText('demo-spring')
  await page.getByRole('navigation').getByRole('button', { name: /Source reports/ }).click()
  await expect(page.locator('.source-report-card')).toHaveCount(4)
  await expect(page.locator('.report-cards')).toContainText('Reported date (not collection)')
  await expect(page.locator('.report-cards')).toContainText('2024-02-18')
})

test('CSV and print identify the selected collection-date pair and historical guidance', async ({ page }) => {
  await selectPair(page, 'demo-spring', 'demo-autumn')
  await page.getByRole('textbox', { name: 'Search biomarkers' }).fill('iron')
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export comparison' }).click()
  const stream = await (await pending).createReadStream()
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(Buffer.from(chunk))
  const csv = Buffer.concat(chunks).toString()
  expect(csv).toContain('2024-06-14 result')
  expect(csv).toContain('2024-10-14 result')
  expect(csv).toContain('demo-spring')
  expect(csv).toContain('Collection date')
  expect(csv).toContain('Units differ')
  expect(csv).not.toContain('2025-02-14 result')
  await page.emulateMedia({ media: 'print' })
  await expect(page.locator('.print-report')).toContainText('Collected 14 Jun 2024')
  await expect(page.locator('.print-report')).toContainText('Historical selection')
  await expect(page.locator('.print-report tbody tr')).toHaveCount(1)
})

test('legacy browser storage migrates without claiming collection dates', async ({ page }) => {
  await page.evaluate((data) => localStorage.setItem(`wellnote-local-dataset:v1:${location.pathname}`, JSON.stringify(data)),
    { schemaVersion: 1, person, reports, markers })
  await page.reload()
  await expect(page.locator('.local-label')).toHaveText('Local import')
  await selectPair(page)
  await expect(page.getByRole('combobox', { name: 'After report', exact: true }).locator('option')).toHaveCount(2)
  await expect(page.locator('.report-date-pair')).toContainText('Collection date not supplied; legacy report date')
  await openSettings(page)
  await page.getByRole('button', { name: 'Clear personal data / return to demo' }).click()
  await expect(page.getByRole('combobox', { name: 'After report', exact: true }).locator('option')).toHaveCount(4)
})

test('mobile has keyboard-accessible pair selectors covering all reports', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await selectPair(page)
  const after = page.getByRole('combobox', { name: 'After report', exact: true })
  await after.scrollIntoViewIfNeeded()
  await expect(after).toBeVisible()
  await after.focus()
  await page.keyboard.press('Home')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(after).not.toHaveValue('demo-latest')
  await after.selectOption('demo-latest')
  await expect(page.locator('.results-table thead')).toContainText('demo-latest')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('malformed history report IDs and unknown readings are actionable', async ({ page }) => {
  const data = structuredClone(demoDataset)
  data.reports[1]!.id = data.reports[0]!.id
  await importData(page, data)
  await expect(page.getByRole('alert')).toContainText('duplicate report IDs')
  const unknown = structuredClone(demoDataset)
  unknown.markers[0]!.readings['unknown-report'] = null
  await importData(page, unknown)
  await expect(page.getByRole('alert')).toContainText('unsupported field')
  await expect(page.locator('.local-label')).toHaveText('Sample data')
})

test('unsupported flags and supplied report notes receive visible non-prescriptive review context', async ({ page }) => {
  const data = structuredClone(demoDataset)
  data.reports.at(-1)!.note = 'Fictional demographic metadata is unverified; check the source.'
  data.markers = [{
    id: 'example-unsupported', name: 'Invented unsupported marker', group: 'kidney', unit: 'example units', priority: 100,
    readings: {
      'demo-baseline': { raw: '7', sourceLabel: 'Fictional fixture', reference: { kind: 'numeric', label: '0–10', min: 0, max: 10 } },
      'demo-latest': { raw: '11', sourceLabel: 'Fictional fixture', reference: { kind: 'numeric', label: '0–10', min: 0, max: 10 }, note: 'An invented report-specific interpretation note.' },
    },
  }]
  await importData(page, data)
  await page.getByRole('navigation').getByRole('button', { name: /Your next steps/ }).click()
  await expect(page.locator('.guidance-review-kidney')).toContainText('Invented unsupported marker')
  await expect(page.locator('.guidance-reading-notes')).toContainText('report-specific interpretation note')
  await expect(page.locator('.guidance-caution')).toContainText('not a treatment plan')
  await page.getByRole('button', { name: 'Kidney health review', exact: true }).click()
  await expect(page.locator('.guidance-card')).toHaveCount(1)
  await page.getByRole('navigation').getByRole('button', { name: /Source reports/ }).click()
  await expect(page.locator('.report-context-note')).toContainText('not independently verified')
  await expect(page.locator('.report-context-note')).toContainText('demographic metadata is unverified')
})
