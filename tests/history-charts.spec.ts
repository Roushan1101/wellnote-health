import { expect, test, type Page } from '@playwright/test'
import { demoDataset } from '../src/data/history'
import type { Dataset, HistoryMarker } from '../src/types'
import { importJson, selectPair } from './helpers'

async function importHistory(page: Page, data: Dataset) {
  await importJson(page, data, 'fictional-chart-history.json')
}

const fixture = (): Dataset => {
  const data = structuredClone(demoDataset)
  const dates = ['2020-01-01', '2020-01-11', '2020-02-01', '2020-04-01']
  data.reports = data.reports.map((report, index) => ({
    ...report, date: dates[index]!, collectionDate: dates[index]!, reportedDate: '2021-01-01',
  }))
  const marker: HistoryMarker = {
    id: 'chart-example', name: 'Fictional chart marker', group: 'blood', unit: 'example units', priority: 1,
    readings: Object.fromEntries(data.reports.map((report, index) => [report.id, {
      raw: String(index + 2), sourceLabel: 'Invented chart source',
      reference: { kind: 'numeric', label: `${index}–${index + 10}`, min: index, max: index + 10 },
    }])),
  }
  data.markers = [marker]
  return data
}

test.beforeEach(async ({ page }) => { await page.goto('./') })

test('overview line chart spans all four reports and point activation opens complete detail', async ({ page }) => {
  await expect(page.locator('.local-label')).toHaveText('Sample data')
  await expect(page.locator('.profile-info')).toContainText('Demo illustrations')
  await expect(page.locator('.history-overview-panel')).toContainText('4 reports')
  await expect(page.locator('.history-overview-panel [data-history-point]')).toHaveCount(4)
  await expect(page.locator('.history-overview-panel [data-reference-report]')).toHaveCount(4)
  await expect(page.locator('.history-overview-panel')).toContainText('Illustrative reference')
  await page.locator('.history-overview-panel [data-history-point]').nth(1).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('[data-history-reading]')).toHaveCount(4)
  await expect(dialog.locator('[data-history-point]')).toHaveCount(4)
  await expect(dialog).toContainText('Selected two-report comparison')
})

test('Comparison navigation shows all four columns independent of the chosen pair', async ({ page }) => {
  await selectPair(page, undefined, 'demo-spring')
  await page.getByRole('navigation').getByRole('button', { name: 'Comparison', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Compare the whole history.' })).toBeVisible()
  await expect(page.locator('[data-comparison-report]')).toHaveCount(4)
  await expect(page.locator('[data-history-marker]')).toHaveCount(demoDataset.markers.length)
  await expect(page.locator('.history-comparison-count')).toContainText('4 of 4 reports')
  await page.getByRole('textbox', { name: 'Search all-report biomarkers' }).fill('magnesium')
  await expect(page.locator('[data-history-marker]')).toHaveCount(1)
  await expect(page.locator('[data-comparison-reading]')).toHaveCount(4)
  await expect(page.locator('[data-comparison-reading]').first()).toContainText('Not reported')
  await page.getByRole('button', { name: 'Open Magnesium all-report details' }).click()
  await expect(page.getByRole('dialog').locator('[data-history-reading]')).toHaveCount(4)
  await page.keyboard.press('Escape')
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Compare the whole history.' })).toBeVisible()
})

test('all-report slicers combine sample, category, status and availability filters', async ({ page }) => {
  await page.getByRole('navigation').getByRole('button', { name: 'Comparison', exact: true }).click()
  await page.getByRole('combobox', { name: 'All-report status' }).selectOption('low')
  await expect(page.locator('.history-matrix')).toContainText('Vitamin D')
  await page.getByRole('button', { name: 'Reset all-report filters' }).click()
  await page.getByRole('textbox', { name: 'Search all-report biomarkers' }).fill('magnesium')
  await page.getByRole('combobox', { name: 'All-report availability' }).selectOption('every')
  await expect(page.getByRole('heading', { name: 'No matching all-report biomarkers' })).toBeVisible()
  await page.getByRole('combobox', { name: 'All-report availability' }).selectOption('any')
  await page.getByRole('checkbox', { name: 'Include report demo-baseline', exact: true }).uncheck()
  await expect(page.locator('[data-comparison-report]')).toHaveCount(3)
  await page.getByRole('button', { name: 'Kidney health', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'No matching all-report biomarkers' })).toBeVisible()
  await page.getByRole('button', { name: 'Reset all-report filters' }).click()
  for (const report of demoDataset.reports) await page.getByRole('checkbox', { name: `Include report ${report.id}`, exact: true }).uncheck()
  await expect(page.getByRole('alert')).toContainText('Select at least one report')
  await expect(page.getByRole('button', { name: 'Export all-report CSV' })).toBeDisabled()
})

test('all-history x coordinates use elapsed collection dates, not report dates', async ({ page }) => {
  await importHistory(page, fixture())
  const points = page.locator('.history-overview-panel [data-history-point]')
  await expect(points).toHaveCount(4)
  const positions = await points.evaluateAll((items) => items.map((item) => Number(item.getAttribute('data-date-position'))))
  expect(positions).toEqual([0, 10 / 91, 31 / 91, 1])
  await expect(page.locator('.history-overview-panel')).toContainText('Report reference')
  await expect(page.locator('.history-overview-panel')).not.toContainText('Illustrative reference')
  await expect(page.locator('.history-overview-panel .history-sample-dates')).toContainText('Collected 1 Jan 2020')
  await expect(page.locator('.history-overview-panel .history-sample-dates')).not.toContainText('2021')
})

test('bounded and missing samples break lines while all raw readings remain available', async ({ page }) => {
  const data = fixture()
  data.markers[0]!.readings['demo-spring']!.raw = '<3'
  data.markers[0]!.readings['demo-autumn'] = null
  await importHistory(page, data)
  await expect(page.locator('.history-overview-panel [data-history-point]')).toHaveCount(2)
  await expect(page.locator('.history-overview-panel [data-history-segment]')).toHaveCount(0)
  await page.getByRole('button', { name: 'Open Fictional chart marker full history' }).click()
  await expect(page.getByRole('dialog').locator('[data-history-reading="demo-spring"]')).toContainText('<3')
  await expect(page.getByRole('dialog').locator('[data-history-reading="demo-autumn"]')).toContainText('Not reported')
})

test('different and blank units disable shared plots, preserving normalized provenance', async ({ page }) => {
  const data = fixture()
  data.markers[0]!.readings['demo-spring']!.unit = ''
  data.markers[0]!.readings['demo-latest']!.sourceRaw = '0.05'
  data.markers[0]!.readings['demo-latest']!.sourceUnit = 'original example unit'
  data.markers[0]!.readings['demo-latest']!.sourceReference = 'Original illustrative reference'
  await importHistory(page, data)
  await expect(page.locator('.history-overview-panel .history-chart-unavailable')).toContainText('Units differ or are blank')
  await expect(page.locator('.history-overview-panel [data-history-point]')).toHaveCount(0)
  await page.getByRole('button', { name: 'Open Fictional chart marker full history' }).click()
  await expect(page.getByRole('dialog').locator('[data-history-reading="demo-spring"]')).toContainText('Unit not supplied')
  await expect(page.getByRole('dialog').locator('[data-history-reading="demo-latest"]')).toContainText('0.05 original example unit')
})

test('same-day sources retain all samples at the same x without invented chronology', async ({ page }) => {
  const data = fixture()
  data.reports[1]!.date = data.reports[0]!.date
  data.reports[1]!.collectionDate = data.reports[0]!.date
  await importHistory(page, data)
  const points = page.locator('.history-overview-panel [data-history-point]')
  expect(await points.nth(0).getAttribute('data-date-position')).toBe(await points.nth(1).getAttribute('data-date-position'))
  await expect(page.locator('.history-overview-panel')).toContainText('Same-day samples share the same x position')
  await expect(page.locator('.history-overview-panel [data-history-segment]')).toHaveCount(2)
})

test('all-report exports and print include every selected source with appropriate privacy labels', async ({ page }) => {
  await page.getByRole('navigation').getByRole('button', { name: 'Comparison', exact: true }).click()
  await page.getByRole('textbox', { name: 'Search all-report biomarkers' }).fill('vitamin d')
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export all-report CSV' }).click()
  const stream = await (await pending).createReadStream()
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(Buffer.from(chunk))
  const csv = Buffer.concat(chunks).toString()
  expect(csv.split('\r\n')).toHaveLength(5)
  for (const report of demoDataset.reports) expect(csv).toContain(report.id)
  expect(csv).toContain('SYNTHETIC DEMO')
  await page.emulateMedia({ media: 'print' })
  await expect(page.locator('.all-report-print')).toBeVisible()
  await expect(page.locator('.all-report-print')).toContainText('1 matching biomarkers across 4 selected reports')
  await expect(page.locator('.all-report-print tbody tr')).toHaveCount(4)
  await expect(page.locator('.print-report')).toHaveCount(0)
})

test('mobile and keyboard chart/detail and comparison remain usable without page overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const point = page.locator('.history-overview-panel [data-history-point]').first()
  await point.scrollIntoViewIfNeeded()
  const target = await point.boundingBox()
  expect(target?.width).toBeGreaterThanOrEqual(44)
  expect(target?.height).toBeGreaterThanOrEqual(44)
  await point.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await page.getByRole('navigation').getByRole('button', { name: 'Comparison', exact: true }).click()
  await expect(page.locator('[data-comparison-report]')).toHaveCount(4)
  await expect(page.getByRole('region', { name: /All reports comparison table/ })).toBeVisible()
  await expect(page.locator('.history-matrix')).toHaveCSS('font-size', '16px')
  await expect(page.getByRole('textbox', { name: 'Search all-report biomarkers' })).toHaveCSS('font-size', '16px')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('fifty-report synthetic history retains every sample and comparison column', async ({ page }) => {
  const data = fixture()
  data.reports = Array.from({ length: 50 }, (_, index) => {
    const date = new Date(Date.UTC(2019, 0, index + 1)).toISOString().slice(0, 10)
    return { ...data.reports[0]!, id: `fictional-${String(index).padStart(2, '0')}`, date, collectionDate: date }
  })
  data.markers[0]!.readings = Object.fromEntries(data.reports.map((report, index) => [report.id, {
    raw: String(index + 1), sourceLabel: 'Synthetic scalable history', reference: { kind: 'numeric', label: '0–60', min: 0, max: 60 },
  }]))
  await importHistory(page, data)
  await expect(page.locator('.history-overview-panel [data-history-point]')).toHaveCount(50)
  await page.getByRole('navigation').getByRole('button', { name: 'Comparison', exact: true }).click()
  await expect(page.locator('[data-comparison-report]')).toHaveCount(50)
  await expect(page.locator('[data-comparison-reading]')).toHaveCount(50)
})

test('source-specific strict boundaries and statuses remain distinct across all reports', async ({ page }) => {
  const data = fixture()
  data.markers[0]!.readings['demo-spring']!.reference = { kind: 'numeric', label: '<3', max: 3, maxExclusive: true }
  data.markers[0]!.readings['demo-autumn']!.reference = { kind: 'numeric', label: '0–2', min: 0, max: 2 }
  await importHistory(page, data)
  await expect(page.locator('.history-overview-panel [data-reference-report="demo-spring"] [stroke-dasharray]')).toHaveCount(1)
  await page.getByRole('navigation').getByRole('button', { name: 'Comparison', exact: true }).click()
  await expect(page.locator('[data-comparison-reading="demo-spring"]')).toContainText('At cutoff')
  await expect(page.locator('[data-comparison-reading="demo-spring"]')).toContainText('<3')
  await expect(page.locator('[data-comparison-reading="demo-autumn"]')).toContainText('High')
  await expect(page.locator('[data-comparison-reading="demo-autumn"]')).toContainText('0–2')
})

test('a marker missing from the selected pair still opens its intermediate history', async ({ page }) => {
  const data = fixture()
  data.markers[0]!.readings = { 'demo-spring': data.markers[0]!.readings['demo-spring']! }
  await importHistory(page, data)
  await expect(page.locator('.history-overview-panel [data-history-point]')).toHaveCount(1)
  await page.getByRole('button', { name: 'Open Fictional chart marker full history' }).click()
  await expect(page.getByRole('dialog').locator('.detail-change')).toContainText('Unavailable')
  await expect(page.getByRole('dialog').locator('[data-history-reading]')).toHaveCount(4)
  await expect(page.getByRole('dialog').locator('[data-history-reading="demo-spring"]')).toContainText('3')
})

test('print and detail use dynamically gated nutrient alternatives, never stale low-result plans', async ({ page }) => {
  const data = fixture()
  data.markers[0]!.id = 'vitamin-d'
  data.markers[0]!.name = 'Fictional nutrient marker'
  data.markers[0]!.group = 'nutrition'
  data.markers[0]!.unit = 'ng/mL'
  for (const reading of Object.values(data.markers[0]!.readings)) {
    if (reading) reading.reference = { kind: 'numeric', label: '>5–10', min: 5, max: 10, minExclusive: true }
  }
  data.markers[0]!.readings['demo-baseline']!.raw = '7'
  data.markers[0]!.readings['demo-spring']!.raw = '12'
  data.markers[0]!.readings['demo-autumn']!.raw = '5'
  data.markers[0]!.readings['demo-latest']!.raw = '3'
  await importHistory(page, data)
  await page.getByRole('button', { name: 'Open Fictional nutrient marker full history' }).click()
  await expect(page.getByRole('dialog').locator('.detail-medications li')).toHaveCount(2)
  await expect(page.getByRole('dialog').locator('.detail-medications')).toContainText('not a prescription')
  await page.getByRole('button', { name: 'Close biomarker details' }).click()
  await expect(page.locator('[data-print-guidance="vitamin-d"] > ul > li')).toHaveCount(3)
  await page.emulateMedia({ media: 'print' })
  await expect(page.locator('.print-medications')).toBeVisible()
  await expect(page.locator('.print-medications li')).toHaveCount(2)
  await expect(page.locator('.print-medications')).toContainText('not a prescription')
  await page.emulateMedia({ media: 'screen' })

  for (const reportId of ['demo-spring', 'demo-autumn']) {
    await selectPair(page, undefined, reportId)
    await expect(page.locator('.print-medications')).toHaveCount(0)
    await page.getByRole('navigation').getByRole('button', { name: 'Overview', exact: true }).click()
    await page.getByRole('button', { name: 'Open Fictional nutrient marker full history' }).click()
    await expect(page.getByRole('dialog').locator('.detail-medications')).toHaveCount(0)
    await page.getByRole('button', { name: 'Close biomarker details' }).click()
  }
  for (const raw of ['7', null]) {
    const neutral = structuredClone(data)
    if (raw === null) neutral.markers[0]!.readings['demo-latest'] = null
    else neutral.markers[0]!.readings['demo-latest']!.raw = raw
    await importHistory(page, neutral)
    await expect(page.locator('.print-medications')).toHaveCount(0)
    await page.getByRole('button', { name: 'Open Fictional nutrient marker full history' }).click()
    await expect(page.getByRole('dialog').locator('.detail-medications')).toHaveCount(0)
    await page.getByRole('button', { name: 'Close biomarker details' }).click()
  }
})

test('mobile y-axis labels stay concise and inside their gutter without rounding source values', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const domains = [[-15.23456, 111.98765], [-0.000003, 0.000008], [-9_000_000, 8_000_000], [999999.12345, 999999.22345]]
  for (const [index, domain] of domains.entries()) {
    const min = domain[0]!
    const max = domain[1]!
    const data = fixture()
    for (const [sampleIndex, reading] of Object.values(data.markers[0]!.readings).entries()) {
      reading!.raw = index === 0 && sampleIndex === 0 ? '12.34006789' : (min + (max - min) * (sampleIndex + 1) / 5).toFixed(12)
      reading!.reference = { kind: 'numeric', label: `${min}–${max}`, min, max }
    }
    const raw = data.markers[0]!.readings['demo-baseline']!.raw
    await importHistory(page, data)
    const chart = page.locator('.history-overview-panel [data-history-chart="chart-example"]')
    await expect(chart.locator('[data-history-point="demo-baseline"]')).toHaveAttribute('data-raw-value', raw)
    await expect(chart.locator('[data-reference-report="demo-baseline"] [data-reference-bound="max"]')).toHaveAttribute('data-reference-value', String(max))
    const tickLabels = chart.locator('[data-history-y-tick]')
    const labels = await tickLabels.allTextContents()
    expect(labels.every((label) => !/\.\d{4,}/.test(label))).toBe(true)
    const gutter = Number(await chart.locator('svg').getAttribute('data-history-left-gutter'))
    const boxes = await tickLabels.evaluateAll((nodes) => nodes.map((node) => {
      const box = (node as SVGGraphicsElement).getBBox()
      return { left: box.x, right: box.x + box.width }
    }))
    expect(boxes.every((box) => box.left >= 1 && box.right <= gutter - 8)).toBe(true)
    await page.getByRole('button', { name: 'Open Fictional chart marker full history' }).click()
    await expect(page.getByRole('dialog').locator('[data-history-reading="demo-baseline"] td > strong')).toHaveText(raw)
    await page.getByRole('button', { name: 'Close biomarker details' }).click()
  }
})
