import { expect, test, type Locator } from '@playwright/test'
import { demoDataset } from '../src/data/history'

const palette = {
  brand: 'rgb(139, 63, 88)',
  hover: 'rgb(119, 51, 74)',
  dark: 'rgb(113, 48, 71)',
  ink: 'rgb(73, 52, 58)',
  muted: 'rgb(118, 93, 100)',
  canvas: 'rgb(255, 248, 245)',
  rose: 'rgb(248, 228, 232)',
  peach: 'rgb(251, 232, 221)',
  line: 'rgb(232, 203, 208)',
  reference: 'rgb(244, 201, 182)',
  referenceLimit: 'rgb(157, 92, 64)',
  white: 'rgb(255, 255, 255)',
}

function channels(color: string): number[] {
  return color.match(/[\d.]+/g)!.slice(0, 3).map(Number)
}

function contrast(foreground: string, background: string): number {
  const luminance = (color: string) => channels(color)
    .map((value) => value / 255)
    .map((value) => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
    .reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index]!, 0)
  const a = luminance(foreground)
  const b = luminance(background)
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05)
}

async function css(locator: Locator, property: string): Promise<string> {
  return locator.evaluate((element, name) => getComputedStyle(element).getPropertyValue(name), property)
}

async function readable(locator: Locator, background: Locator = locator) {
  const foreground = await css(locator, 'color')
  const surface = await css(background, 'background-color')
  expect(surface, 'Contrast checks must use an opaque surface').not.toBe('rgba(0, 0, 0, 0)')
  expect(contrast(foreground, surface), `${foreground} on ${surface}`).toBeGreaterThanOrEqual(4.5)
}

test.beforeEach(async ({ page }) => { await page.goto('./') })

test('rose branding and peach surfaces agree with browser chrome and favicon', async ({ page, request }) => {
  await expect(page.locator('html')).toHaveCSS('background-color', palette.canvas)
  await expect(page.locator('body')).toHaveCSS('color', palette.ink)
  await expect(page.locator('.demo-banner')).toHaveCSS('background-color', palette.brand)
  await expect(page.locator('.sidebar')).toHaveCSS('background-color', palette.peach)
  await expect(page.locator('.data-controls')).toHaveCSS('border-top-color', palette.line)
  await expect(page.locator('.panel').first()).toHaveCSS('background-color', palette.white)
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#8b3f58')
  const favicon = await request.get('./favicon.svg')
  expect(favicon.ok()).toBe(true)
  expect(await favicon.text()).toContain('fill="#8b3f58"')
  expect(await favicon.text()).toContain('stroke="#fbe8dd"')
  await readable(page.locator('.demo-banner strong'), page.locator('.demo-banner'))
  await readable(page.locator('.demo-banner span').first(), page.locator('.demo-banner'))
  await readable(page.locator('.nav-item.active'))
  await readable(page.locator('.nav-item:not(.active)').first(), page.locator('.sidebar'))
})

test('primary, peach and secondary actions retain readable hover and focus states', async ({ page }) => {
  const primary = page.getByRole('button', { name: 'Export comparison', exact: true })
  await expect(primary).toHaveCSS('background-color', palette.brand)
  await readable(primary)
  await primary.hover()
  await expect(primary).toHaveCSS('background-color', palette.hover)
  await readable(primary)
  await page.mouse.move(0, 0)
  await page.keyboard.press('Tab')
  await primary.focus()
  await expect(primary).toHaveCSS('outline-color', palette.brand)
  await expect(primary).toHaveCSS('outline-style', 'solid')
  expect(contrast(await css(primary, 'outline-color'), palette.canvas)).toBeGreaterThanOrEqual(3)
  const light = page.locator('.priority-card .light-button')
  await expect(light).toHaveCSS('background-color', palette.peach)
  await readable(light)
  await readable(page.locator('.priority-card > p'), page.locator('.priority-card'))
  await readable(page.locator('.priority-value .status-badge'))
  await readable(page.locator('.secondary-button').first())
})

test('history and comparison plots use rose measurements and peach reference bands', async ({ page }) => {
  const fixture = structuredClone(demoDataset)
  fixture.markers.push({
    id: 'theme-chart', name: 'Fictional palette example', group: 'blood', unit: 'example units', priority: 1,
    readings: Object.fromEntries(fixture.reports.map((report, index) => [report.id, {
      raw: String(index + 2), sourceLabel: 'Invented theme fixture',
      reference: { kind: 'numeric', min: 0, max: 8, label: '0–8 (invented reference)' },
    }])),
  })
  await page.getByLabel('Load my health data', { exact: true }).setInputFiles({
    name: 'fictional-theme-colors.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fixture)),
  })
  await page.getByRole('combobox', { name: 'Trend biomarker', exact: true }).selectOption('theme-chart')
  const chart = page.locator('.history-overview-panel')
  const line = chart.locator('.history-value-line').first()
  const band = chart.locator('.history-reference-band').first()
  const limit = chart.locator('.history-reference-limit').first()
  await expect(line).toHaveCSS('stroke', palette.brand)
  const lineColor = await css(line, 'stroke')
  await expect(chart.locator('.history-value-point').first()).toHaveCSS('fill', palette.brand)
  await expect(band).toHaveCSS('fill', palette.reference)
  await expect(limit).toHaveCSS('stroke', palette.referenceLimit)
  const opacity = Number(await css(band, 'fill-opacity'))
  const blended = channels(await css(band, 'fill')).map((value) => value * opacity + 255 * (1 - opacity))
  const bandSurface = `rgb(${blended.join(', ')})`
  expect(contrast(lineColor, bandSurface)).toBeGreaterThanOrEqual(3)
  expect(contrast(await css(limit, 'stroke'), bandSurface)).toBeGreaterThanOrEqual(3)
  expect(contrast(await css(chart.locator('.history-axis-label').first(), 'fill'), palette.white)).toBeGreaterThanOrEqual(4.5)
  await expect(page.locator('.reference-band').first()).toHaveCSS('background-color', palette.reference)
  await expect(page.locator('.reading-connector').first()).toHaveCSS('background-color', palette.brand)
  expect(contrast(await css(page.locator('.reading-connector').first(), 'background-color'), palette.reference)).toBeGreaterThanOrEqual(3)
  const point = chart.locator('[data-history-point]').first()
  await point.focus()
  await expect(point.locator('.history-value-point')).toHaveCSS('stroke', palette.dark)
  expect(contrast(await css(point.locator('.history-value-point'), 'stroke'), bandSurface)).toBeGreaterThanOrEqual(3)
})

test('all semantic badge styles stay distinct and meet text contrast', async ({ page }) => {
  const statuses = ['normal', 'high', 'low', 'boundary', 'context', 'missing', 'review']
  const swatches = await page.evaluate((names) => names.map((name) => {
    const badge = document.createElement('span')
    badge.className = `status-badge status-${name}`
    badge.textContent = name
    document.body.append(badge)
    const style = getComputedStyle(badge)
    const result = { name, color: style.color, background: style.backgroundColor }
    badge.remove()
    return result
  }), statuses)
  expect(new Set(swatches.map(({ color }) => color)).size).toBe(statuses.length)
  expect(swatches[0]!.color).toBe('rgb(36, 96, 107)')
  for (const swatch of swatches) {
    expect(contrast(swatch.color, swatch.background), swatch.name).toBeGreaterThanOrEqual(4.5)
  }
})

for (const width of [320, 390, 720]) {
  test(`mobile ${width}px retains rose/peach navigation, chart contrast and touch targets`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    const nav = page.locator('.nav-item.active')
    await expect(nav).toHaveCSS('background-color', palette.canvas)
    await expect(nav).toHaveCSS('color', palette.brand)
    await expect(page.locator('.sidebar')).toHaveCSS('background-color', palette.peach)
    await readable(nav)
    await readable(page.locator('.nav-item:not(.active)').first(), page.locator('.sidebar'))
    await readable(page.locator('.demo-banner span').first(), page.locator('.demo-banner'))
    await readable(page.getByRole('button', { name: 'Export comparison', exact: true }))
    await expect(page.locator('.history-overview-panel .history-value-line').first()).toHaveCSS('stroke', palette.brand)
    expect(contrast(palette.brand, palette.reference)).toBeGreaterThanOrEqual(3)
    for (const control of [nav, page.getByRole('button', { name: 'Export comparison', exact: true })]) {
      expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(44)
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.getByRole('navigation').getByRole('button', { name: 'Comparison', exact: true }).click()
    const selected = page.locator('.history-category-slicers [aria-pressed="true"]')
    await expect(selected).toHaveCSS('background-color', palette.rose)
    await expect(selected).toHaveCSS('border-top-color', palette.brand)
    await readable(selected)
    await readable(page.locator('.history-marker-button').first(), page.locator('.history-matrix-panel'))
    await expect(page.locator('.history-matrix thead')).toHaveCSS('background-color', palette.rose)
    await readable(page.locator('.nav-item.active'))
  })
}
