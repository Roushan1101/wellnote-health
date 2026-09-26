import { describe, expect, it } from 'vitest'
import type { HistoryMarker, HistoryReport, Reading } from '../types'
import { buildChartAxis, buildHistorySeries, defaultHistoryFilters, filterHistoryMarkers, historyCsv, historyUnit } from './history-charts'

const reports: HistoryReport[] = [
  { id: 'sample-a', date: '2020-01-01', collectionDate: '2020-01-01', label: 'A', shortDate: '1 Jan 2020', fullDate: '1 January 2020' },
  { id: 'sample-b', date: '2020-01-11', collectionDate: '2020-01-11', label: 'B', shortDate: '11 Jan 2020', fullDate: '11 January 2020' },
  { id: 'sample-c', date: '2020-02-01', collectionDate: '2020-02-01', label: 'C', shortDate: '1 Feb 2020', fullDate: '1 February 2020' },
  { id: 'sample-d', date: '2020-04-01', collectionDate: '2020-04-01', label: 'D', shortDate: '1 Apr 2020', fullDate: '1 April 2020' },
]
const reading = (raw: string): Reading => ({ raw, sourceLabel: 'Invented chart fixture', reference: { kind: 'numeric', label: '0–10', min: 0, max: 10 } })
const fixture = (): HistoryMarker => ({
  id: 'example-marker', name: 'Invented marker', group: 'blood', unit: 'example units', priority: 1,
  readings: Object.fromEntries(reports.map((report, index) => [report.id, reading(String(index + 2))])),
})

describe('all-history chart safety', () => {
  it('uses readable nice ticks rather than padded-domain decimal artifacts', () => {
    const axis = buildChartAxis(9.23456, 111.98765)
    expect(axis.ticks.map((tick) => tick.label)).toEqual(['0', '50', '100', '150'])
    expect(axis.min).toBeLessThanOrEqual(9.23456)
    expect(axis.max).toBeGreaterThanOrEqual(111.98765)
  })
  it('reserves a label-sized gutter for signed, tiny and large tick labels', () => {
    for (const [min, max] of [[-140, -5], [-0.000003, 0.000008], [-9_000_000, 8_000_000]]) {
      const axis = buildChartAxis(min!, max!)
      expect(axis.ticks.every((tick) => !/\.\d{4,}/.test(tick.label))).toBe(true)
      expect(axis.leftGutter).toBeGreaterThanOrEqual(Math.max(...axis.ticks.map((tick) => tick.label.length)) * 9 + 24)
      expect(new Set(axis.ticks.map((tick) => tick.label)).size).toBe(axis.ticks.length)
    }
  })
  it('uses an explicit offset for a narrow interval at a large magnitude', () => {
    const axis = buildChartAxis(999999.12345, 999999.22345)
    expect(axis.offset).not.toBe(0)
    expect(new Set(axis.ticks.map((tick) => tick.label)).size).toBe(axis.ticks.length)
    expect(axis.ticks.every((tick) => tick.label.length < 12)).toBe(true)
  })
  it('orders all four samples and places points by actual elapsed dates', () => {
    const series = buildHistorySeries(fixture(), [...reports].reverse())
    expect(series.samples.map((sample) => sample.report.id)).toEqual(reports.map((report) => report.id))
    expect(series.samples.map((sample) => sample.x)).toEqual([0, 10 / 91, 31 / 91, 1])
    expect(series.exactCount).toBe(4)
    expect(series.segments).toHaveLength(3)
  })
  it('uses collection date rather than reported date without interpreting local times', () => {
    const data = structuredClone(reports)
    data[1]!.reportedDate = '2021-01-01'
    data[1]!.collectionTime = '11:32 PM'
    expect(buildHistorySeries(fixture(), data).samples[1]?.x).toBe(10 / 91)
  })
  it('keeps same-day points coincident and never invents a same-day line', () => {
    const data = structuredClone(reports)
    data[1]!.date = data[0]!.date
    data[1]!.collectionDate = data[0]!.date
    const series = buildHistorySeries(fixture(), data)
    expect(series.duplicateDays).toBe(true)
    expect(series.samples[0]?.x).toBe(series.samples[1]?.x)
    expect(series.segments.some((segment) => segment.from.day === segment.to.day)).toBe(false)
  })
  it('excludes missing, bounded, interval and text results instead of treating them as zero', () => {
    for (const raw of ['<3', '>3', '2-4', 'Negative']) {
      const marker = fixture()
      marker.readings['sample-b'] = reading(raw)
      const series = buildHistorySeries(marker, reports)
      expect(series.samples[1]?.value).toBeNull()
      expect(series.exactCount).toBe(3)
      expect(series.segments).toHaveLength(1)
      expect(series.samples[1]?.reading?.raw).toBe(raw)
    }
    const marker = fixture()
    marker.readings['sample-b'] = null
    expect(buildHistorySeries(marker, reports).samples[1]?.value).toBeNull()
  })
  it('blocks shared axes and lines for blank or differing effective units', () => {
    for (const unit of ['', 'different units']) {
      const marker = fixture()
      marker.readings['sample-b']!.unit = unit
      expect(historyUnit(marker, marker.readings['sample-b']!)).toBe(unit)
      const series = buildHistorySeries(marker, reports)
      expect(series.blocked).toContain('Units differ or are blank')
      expect(series.exactCount).toBe(0)
      expect(series.segments).toEqual([])
    }
  })
  it('includes every source reference in the domain without flattening changed boundaries', () => {
    const marker = fixture()
    marker.readings['sample-b']!.reference = { kind: 'numeric', label: '>20', min: 20, minExclusive: true }
    marker.readings['sample-c']!.reference = { kind: 'numeric', label: '<30', max: 30, maxExclusive: true }
    const series = buildHistorySeries(marker, reports)
    expect(series.min).toBeLessThan(0)
    expect(series.max).toBeGreaterThan(30)
    expect(series.samples[1]?.reading?.reference).toMatchObject({ min: 20, minExclusive: true })
    expect(series.samples[2]?.reading?.reference).toMatchObject({ max: 30, maxExclusive: true })
  })
  it('preserves normalized provenance without converting or mutating original readings', () => {
    const marker = fixture()
    marker.readings['sample-b'] = { ...reading('4'), sourceRaw: '0.04', sourceUnit: 'other unit', sourceReference: '0–0.1', note: 'Invented normalization performed before import' }
    const original = structuredClone(marker)
    const series = buildHistorySeries(marker, reports)
    expect(series.samples[1]?.value).toBe(4)
    expect(series.samples[1]?.reading?.sourceRaw).toBe('0.04')
    expect(marker).toEqual(original)
  })
  it('supports a single exact point and an entirely nonnumeric history safely', () => {
    const marker = fixture()
    marker.readings = { 'sample-c': reading('0') }
    expect(buildHistorySeries(marker, reports).exactCount).toBe(1)
    expect(buildHistorySeries(marker, reports).segments).toHaveLength(0)
    marker.readings = { 'sample-c': reading('<2') }
    expect(buildHistorySeries(marker, reports).blocked).toContain('No exact numeric values')
  })
})

describe('all-report comparison filters and export', () => {
  it('uses selected reports only, preserving any/every/missing availability semantics', () => {
    const sparse = { ...fixture(), id: 'sparse-example', readings: { 'sample-d': reading('22') } }
    const full = fixture()
    expect(filterHistoryMarkers([full, sparse], reports, defaultHistoryFilters)).toHaveLength(2)
    expect(filterHistoryMarkers([full, sparse], reports, { ...defaultHistoryFilters, presence: 'every' })).toEqual([full])
    expect(filterHistoryMarkers([full, sparse], reports, { ...defaultHistoryFilters, presence: 'missing' })).toEqual([sparse])
    expect(filterHistoryMarkers([full, sparse], reports.slice(0, 2), { ...defaultHistoryFilters, status: 'high' })).toEqual([])
    expect(filterHistoryMarkers([full, sparse], [], defaultHistoryFilters)).toEqual([])
  })
  it('combines category, search and status across the full report history', () => {
    const marker = fixture()
    marker.readings['sample-c'] = reading('24')
    expect(filterHistoryMarkers([marker], reports, { ...defaultHistoryFilters, groups: ['blood'], query: 'INVENTED', status: 'attention' })).toEqual([marker])
    expect(filterHistoryMarkers([marker], reports, { ...defaultHistoryFilters, groups: ['kidney'] })).toEqual([])
  })
  it('exports all four source-specific rows with original bounds, references and formula safety', () => {
    const marker = fixture()
    marker.name = '=FICTIONAL()'
    marker.readings['sample-b'] = { ...reading('<3'), sourceRaw: '<0.03', sourceUnit: 'different original unit', sourceReference: '<0.1', note: 'Synthetic "note"' }
    const csv = historyCsv([marker], [...reports].reverse(), false)
    expect(csv.split('\r\n')).toHaveLength(5)
    expect(csv).toContain('SYNTHETIC DEMO')
    expect(csv).toContain(`"'=FICTIONAL()"`)
    expect(csv).toContain('"<3"')
    expect(csv).toContain('"<0.03"')
    expect(csv).toContain('Synthetic ""note""')
    expect(csv.indexOf('sample-a')).toBeLessThan(csv.indexOf('sample-d'))
  })
})
