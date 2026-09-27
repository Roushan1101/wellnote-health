import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { join } from 'node:path'

test.beforeEach(async ({ page }) => { await page.goto('./') })

test('overview has permanent synthetic identity and no external background requests', async ({ page }) => {
  const external: string[] = []
  page.on('request', (request) => {
    if (!request.url().startsWith('http://127.0.0.1:5196') && !request.url().startsWith('data:')) external.push(request.url())
  })
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Your health, in perspective.' })).toBeVisible()
  await expect(page.locator('.local-label')).toHaveText('Sample data')
  await expect(page.locator('.demo-banner')).toHaveCount(0)
  await expect(page.locator('.profile-info')).toContainText('RK')
  await expect(page.locator('.results-meta')).toContainText('25 of 25')
  await page.locator('.app-footer').scrollIntoViewIfNeeded()
  await expect(page.locator('.app-footer')).toContainText('Synthetic data only')
  expect(external).toEqual([])
})

test('search, empty state, categories, sorting and pagination work', async ({ page }) => {
  await page.getByRole('button', { name: 'Biomarkers', exact: true }).click()
  await expect(page.locator('.results-table tbody tr')).toHaveCount(8)
  await page.getByRole('button', { name: 'Next results page' }).click()
  await expect(page.locator('.page-number')).toHaveText('2 / 4')
  await page.getByRole('combobox', { name: 'Rows per page' }).selectOption('25')
  await expect(page.locator('.results-table tbody tr')).toHaveCount(25)
  await page.getByRole('textbox', { name: 'Search biomarkers' }).fill('nothing-matches')
  await expect(page.getByRole('heading', { name: 'No matching biomarkers' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Export comparison' })).toBeDisabled()
  await page.getByRole('button', { name: 'Clear all filters' }).click()
  await page.getByRole('button', { name: /^Nutrition\s*4$/ }).click()
  await expect(page.locator('.results-table tbody tr')).toHaveCount(4)
  await page.getByRole('combobox', { name: 'Sort biomarkers' }).selectOption('name')
  await expect(page.locator('.results-table tbody tr').first()).toHaveAttribute('data-marker-id', 'magnesium')
})

test('status and trend filters, comparison modes and historical context work', async ({ page }) => {
  await page.locator('#status-filter').selectOption('boundary')
  await expect(page.locator('.results-table tbody tr')).toHaveCount(1)
  await expect(page.locator('.results-table tbody tr')).toHaveAttribute('data-marker-id', 'hba1c')
  await page.getByRole('button', { name: /^Reset/ }).click()
  await page.locator('#trend-filter').selectOption('returned')
  await expect(page.locator('.results-meta')).toContainText('4 of 25')
  await page.getByRole('button', { name: 'Earlier', exact: true }).click()
  await expect(page.locator('#trend-filter')).toHaveCount(0)
  await expect(page.locator('.results-table thead')).not.toContainText('14 FEB 2025')
  await expect(page.locator('.historical-card')).toContainText('fictional', { ignoreCase: true })
  await page.getByRole('button', { name: 'Later', exact: true }).click()
  await expect(page.locator('.results-table thead')).toContainText('14 FEB 2025')
})

test('detail dialogs preserve bounds and disclose synthetic provenance', async ({ page }) => {
  await page.getByRole('textbox', { name: 'Search biomarkers' }).fill('hscrp')
  await page.getByRole('button', { name: 'Details for High-sensitivity CRP' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('<0.7')
  await expect(dialog).toContainText('Exact change not available')
  await expect(dialog).toContainText('Synthetic fixture: hscrp')
  await expect(dialog).toContainText('NOT A MEDICAL RECORD')
  await expect(dialog.locator('a[href*=".pdf"]')).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await page.getByRole('textbox', { name: 'Search biomarkers' }).fill('b12')
  await page.getByRole('button', { name: 'Details for Vitamin B12' }).click()
  await expect(page.locator('.range-change-callout')).toContainText('reference changed')
})

test('missing samples and guidance remain usable', async ({ page }) => {
  await page.getByRole('textbox', { name: 'Search biomarkers' }).fill('magnesium')
  await page.getByRole('button', { name: 'Details for Magnesium' }).click()
  await expect(page.getByRole('dialog')).toContainText('Not reported')
  await page.getByRole('button', { name: 'Close biomarker details' }).click()
  await page.getByRole('navigation').getByRole('button', { name: /Your next steps/ }).click()
  await expect(page.locator('.guidance-card')).toHaveCount(4)
  await page.getByRole('button', { name: 'Vitamin D', exact: true }).click()
  await expect(page.locator('.guidance-card')).toHaveCount(1)
  await page.getByRole('button', { name: 'Clinician discussion', exact: true }).click()
  await expect(page.locator('.everyday-guidance')).toHaveCount(0)
  await expect(page.locator('.guidance-caution')).toContainText('Do not choose supplements or doses')
})

test('CSV download is filtered and explicitly synthetic', async ({ page }) => {
  await page.getByRole('textbox', { name: 'Search biomarkers' }).fill('vitamin d')
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export comparison' }).click()
  const download = await pending
  expect(download.suggestedFilename()).toContain('synthetic')
  const stream = await download.createReadStream()
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(Buffer.from(chunk))
  const csv = Buffer.concat(chunks).toString('utf8')
  expect(csv).toContain('SYNTHETIC DEMO - NOT A MEDICAL RECORD')
  expect(csv.split('\r\n')).toHaveLength(2)
})

test('source section provides synthetic summaries and JSON, never document links', async ({ page }) => {
  await page.getByRole('navigation').getByRole('button', { name: /Source reports/ }).click()
  await expect(page.getByRole('region', { name: 'Synthetic report summaries' })).toBeVisible()
  await page.getByText('View synthetic summary', { exact: true }).first().click()
  await expect(page.locator('.source-earlier details')).toContainText('Sample volume')
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download synthetic 14 February 2025 JSON' }).click()
  const download = await pending
  const stream = await download.createReadStream()
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(Buffer.from(chunk))
  const data = JSON.parse(Buffer.concat(chunks).toString('utf8'))
  expect(data.notice).toContain('NOT A MEDICAL RECORD')
  expect(data.measurements).toHaveLength(24)
  await expect(page.locator('a[href*=".pdf"]')).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'The story starts here.' })).toBeVisible()
})

test('print view is filtered, dated correctly and clearly fictional', async ({ page }) => {
  await page.getByRole('textbox', { name: 'Search biomarkers' }).fill('iron')
  await page.emulateMedia({ media: 'print' })
  await expect(page.locator('.print-report')).toBeVisible()
  await expect(page.locator('.app-shell')).toBeHidden()
  await expect(page.locator('.print-report')).toContainText('NOT A MEDICAL RECORD')
  await expect(page.locator('.print-report table tbody tr')).toHaveCount(1)
  await expect(page.locator('.print-report thead')).toContainText('14 Feb 2024')
  await expect(page.locator('.print-report thead')).toContainText('14 Feb 2025')
})

test('mobile layout stays within viewport with a visible demo notice', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.locator('.local-label')).toBeInViewport()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.getByRole('button', { name: 'Biomarkers', exact: true }).click()
  await page.getByRole('textbox', { name: 'Search biomarkers' }).fill('vitamin')
  await expect(page.locator('.results-table tbody tr')).toHaveCount(2)
})

test('production document uses relative assets for repository hosting', async () => {
  const html = await readFile('dist/index.html', 'utf8')
  expect(html).toContain('href="./favicon.svg"')
  expect(html).toMatch(/src="\.\/assets\//)
  expect(html).not.toMatch(/(?:src|href)="\/assets\//)
})

test('production app loads and reloads below a repository subpath', async ({ page }) => {
  const prefix = '/wellnote-demo/'
  const server = createServer(async (request, response) => {
    const pathname = new URL(request.url ?? '/', 'http://localhost').pathname
    if (!pathname.startsWith(prefix)) { response.writeHead(404).end(); return }
    const relative = pathname.slice(prefix.length) || 'index.html'
    if (!/^(index\.html|favicon\.svg|assets\/[a-zA-Z0-9_.-]+)$/.test(relative)) {
      response.writeHead(404).end(); return
    }
    try {
      const content = await readFile(join('dist', ...relative.split('/')))
      const type = relative.endsWith('.js') ? 'text/javascript'
        : relative.endsWith('.css') ? 'text/css'
          : relative.endsWith('.svg') ? 'image/svg+xml'
            : relative.endsWith('.woff2') ? 'font/woff2' : 'text/html'
      response.writeHead(200, { 'Content-Type': type }).end(content)
    } catch { response.writeHead(404).end() }
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  try {
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('No test server address')
    const origin = `http://127.0.0.1:${address.port}`
    await page.goto(`${origin}${prefix}`)
    await expect(page.getByRole('heading', { name: 'Your health, in perspective.' })).toBeVisible()
    await page.getByRole('navigation').getByRole('button', { name: /Source reports/ }).click()
    await page.reload()
    await expect(page.getByRole('heading', { name: 'The story starts here.' })).toBeVisible()
    expect((await page.request.get(`${origin}${prefix}favicon.svg`)).status()).toBe(200)
    await expect(page.locator('.local-label')).toHaveText('Sample data')
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  }
})
