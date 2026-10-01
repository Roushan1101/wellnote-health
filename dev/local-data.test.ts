import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createServer, type ViteDevServer } from 'vite'
import { demoDataset } from '../src/lib/dataset'
import { localDataPlugin } from './local-data'

describe('private local development startup', () => {
  let directory: string
  let filename: string
  let server: ViteDevServer

  beforeEach(async () => {
    directory = mkdtempSync(join(tmpdir(), 'wellnote-dev-data-'))
    filename = join(directory, 'private-history.json')
    server = await createServer({
      configFile: false, root: directory, appType: 'custom',
      plugins: [localDataPlugin(filename)],
      server: { middlewareMode: true },
      optimizeDeps: { noDiscovery: true, include: [] },
    })
  })

  afterEach(async () => {
    await server.close()
    rmSync(directory, { recursive: true, force: true })
  })

  it('runs only in development and leaves missing private files as the public demo', async () => {
    expect(localDataPlugin(filename).apply).toBe('serve')
    const html = await server.transformIndexHtml('/', '<html><head></head><body></body></html>')
    expect(html).not.toContain('id="wellnote-local-data"')
  })

  it('allows a network-bound demo when no private file exists', async () => {
    server.config.server.host = '0.0.0.0'
    const html = await server.transformIndexHtml('/', '<html><head></head><body></body></html>')
    expect(html).not.toContain('id="wellnote-local-data"')
  })

  it.each([true, '0.0.0.0', '::', '192.168.1.10'])('rejects private data added after startup on non-loopback host %s', async (host) => {
    server.config.server.host = host
    writeFileSync(filename, JSON.stringify(demoDataset), 'utf8')
    await expect(server.transformIndexHtml('/', '<html><head></head><body></body></html>')).rejects.toThrow('--host 127.0.0.1')
  })

  it.each(['127.0.0.1', 'localhost', '::1'])('loads private history on loopback host %s', async (host) => {
    server.config.server.host = host
    writeFileSync(filename, JSON.stringify(demoDataset), 'utf8')
    const html = await server.transformIndexHtml('/', '<html><head></head><body></body></html>')
    expect(html).toContain('id="wellnote-local-data"')
  })

  it('validates private dates and regenerates stale display labels on every page load', async () => {
    const dataset = structuredClone(demoDataset)
    dataset.reports[0]!.date = dataset.reports[0]!.collectionDate = '2024-01-12'
    dataset.reports[0]!.shortDate = 'stale label'
    writeFileSync(filename, JSON.stringify(dataset), 'utf8')
    let html = await server.transformIndexHtml('/', '<html><head></head><body></body></html>')
    expect(html).toContain('id="wellnote-local-data"')
    expect(html).toContain('"shortDate":"12 Jan 2024"')
    expect(html).not.toContain('stale label')
    dataset.reports[0]!.date = dataset.reports[0]!.collectionDate = '2024-01-13'
    writeFileSync(filename, JSON.stringify(dataset), 'utf8')
    html = await server.transformIndexHtml('/', '<html><head></head><body></body></html>')
    expect(html).toContain('"shortDate":"13 Jan 2024"')
    expect(html).not.toContain('12 Jan 2024')
  })

  it('rejects invalid private files instead of silently showing unrelated dates', async () => {
    writeFileSync(filename, '{"schemaVersion":0}', 'utf8')
    await expect(server.transformIndexHtml('/', '<html><head></head><body></body></html>')).rejects.toThrow('schemaVersion')
  })

  it('escapes embedded JSON so source text cannot close the data script', async () => {
    const dataset = structuredClone(demoDataset)
    dataset.person.name = '</script><script>alert(1)</script>'
    writeFileSync(filename, JSON.stringify(dataset), 'utf8')
    const html = await server.transformIndexHtml('/', '<html><head></head><body></body></html>')
    expect(html).not.toContain(dataset.person.name)
    expect(html).toContain('\\u003c/script>')
  })
})
