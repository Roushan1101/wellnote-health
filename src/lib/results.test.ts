import { describe, expect, it } from 'vitest'
import { markers, findMarker } from '../data/markers'
import { daysBetweenReports, groups, person, reports } from '../data/reports'
import { guidance } from '../data/guidance'
import {
  createCsv, defaultFilters, exactValue, filterMarkers, getChange, getTrend,
  parseValue, rangeChanged, readingStatus, summarize,
} from './results'
import { createSyntheticReport } from './synthetic-report'
import type { Reading } from '../types'

describe('public synthetic dataset', () => {
  it('contains exactly 25 unique fictional markers in eight categories', () => {
    expect(markers).toHaveLength(25)
    expect(new Set(markers.map((marker) => marker.id)).size).toBe(25)
    expect(new Set(markers.map((marker) => marker.group)).size).toBe(8)
    expect(groups).toHaveLength(8)
    expect(person.name).toBe('RK')
  })
  it('uses only the two invented dates', () => {
    expect(reports.earlier.date).toBe('2024-02-14')
    expect(reports.latest.date).toBe('2025-02-14')
    expect(daysBetweenReports).toBe(366)
  })
  it('has transparent provenance for every supplied reading', () => {
    for (const marker of markers) {
      for (const reading of [marker.earlier, marker.latest]) {
        if (reading) {
          expect(reading.sourceLabel).toContain('Synthetic')
          expect(reading).not.toHaveProperty('page')
        }
      }
    }
  })
  it('has 24 results per report and 23 shared', () => {
    for (const key of ['earlier', 'latest'] as const) {
      expect(summarize(markers, key)).toMatchObject({ reported: 24, shared: 23, missing: 1 })
    }
  })
  it('keeps guidance references valid and non-prescriptive', () => {
    expect(guidance).toHaveLength(8)
    for (const plan of guidance) {
      for (const id of plan.markerIds) {
        if (id === 'calcium') expect(plan.group).toBe('kidney')
        else expect(findMarker(id)).toBeDefined()
      }
      expect(plan.caution.length).toBeGreaterThan(20)
      expect(plan.sources.every((source) => source.url.startsWith('https://'))).toBe(true)
    }
  })
  it('fails clearly for unknown marker IDs', () => {
    expect(() => findMarker('not-a-marker')).toThrow('Unknown synthetic marker')
  })
})

describe('comparisons and references', () => {
  it('parses exact, bounded, interval and qualitative values without guessing', () => {
    expect(parseValue('2.05')).toEqual({ kind: 'exact', value: 2.05 })
    expect(parseValue('<0.7')).toEqual({ kind: 'less', value: 0.7 })
    expect(parseValue('>8')).toEqual({ kind: 'greater', value: 8 })
    expect(parseValue('1-3')).toEqual({ kind: 'interval', min: 1, max: 3 })
    expect(parseValue('Negative')).toEqual({ kind: 'text', value: 'negative' })
  })
  it('preserves censored bounds without an exact percentage', () => {
    const marker = findMarker('hscrp')
    expect(exactValue(marker.latest)).toBeNull()
    expect(getChange(marker)).toMatchObject({ label: 'Lower', amount: null, percent: null })
    expect(readingStatus(marker.latest)).toBe('normal')
  })
  it('evaluates a strict cutoff separately from a high result', () => {
    expect(readingStatus(findMarker('hba1c').latest)).toBe('boundary')
    expect(readingStatus(findMarker('hba1c').earlier)).toBe('high')
  })
  it('evaluates each changed reference separately', () => {
    const marker = findMarker('vitamin-b12')
    expect(rangeChanged(marker)).toBe(true)
    expect(readingStatus(marker.earlier)).toBe('normal')
    expect(readingStatus({ ...marker.earlier!, reference: marker.latest!.reference })).toBe('low')
    expect(rangeChanged(findMarker('tsh'))).toBe(true)
  })
  it('handles new and absent samples', () => {
    expect(getTrend(findMarker('magnesium'))).toBe('new')
    expect(getChange(findMarker('magnesium')).detail).toContain(reports.earlier.shortDate)
    expect(getTrend(findMarker('sample-volume'))).toBe('missing')
    expect(readingStatus(findMarker('sample-volume').latest)).toBe('missing')
  })
  it('keeps context and qualitative results distinct', () => {
    expect(readingStatus(findMarker('hdl-ldl-ratio').latest)).toBe('context')
    expect(readingStatus(findMarker('urine-protein').latest)).toBe('normal')
  })
  it('calculates exact changes and range returns', () => {
    expect(getChange(findMarker('vitamin-d'))).toMatchObject({ amount: -6, percent: -25, direction: 'down' })
    expect(getTrend(findMarker('iron'))).toBe('returned')
    expect(getTrend(findMarker('ldl'))).toBe('toward')
  })
  it('marks a bound overlapping a reference as needing review', () => {
    const reading: Reading = { raw: '<8', sourceLabel: 'Synthetic', reference: { kind: 'numeric', label: '5–10', min: 5, max: 10 } }
    expect(readingStatus(reading)).toBe('review')
  })
})

describe('filters and exports', () => {
  it('combines text, category and status filters', () => {
    expect(filterMarkers(markers, { ...defaultFilters, query: 'vitamin', groups: ['nutrition'], status: 'low' }, 'compare').map((marker) => marker.id)).toEqual(['vitamin-d'])
  })
  it('supports return-to-range filters and ignores trends in a snapshot', () => {
    const filters = { ...defaultFilters, trend: 'returned' as const }
    expect(filterMarkers(markers, filters, 'compare')).toHaveLength(4)
    expect(filterMarkers(markers, filters, 'earlier')).toHaveLength(25)
  })
  it('sorts without mutating the source dataset', () => {
    const ids = markers.map((marker) => marker.id)
    const sorted = filterMarkers(markers, { ...defaultFilters, sort: 'name' }, 'compare')
    expect(sorted[0]?.name).toBe('ALT')
    expect(markers.map((marker) => marker.id)).toEqual(ids)
  })
  it('includes only matching rows in CSV with an explicit demo label', () => {
    const csv = createCsv([findMarker('magnesium')])
    expect(csv.split('\r\n')).toHaveLength(2)
    expect(csv).toContain('SYNTHETIC DEMO - NOT A MEDICAL RECORD')
    expect(csv).toContain('Not reported')
    expect(csv).toContain('2024-02-14 result')
    expect(csv).not.toContain('PDF')
  })
  it('neutralizes spreadsheet formulas and quotes embedded text', () => {
    const marker = { ...findMarker('iron'), name: '=DEMO()', note: 'Example "quoted" text' }
    const csv = createCsv([marker])
    expect(csv).toContain('\"\'=DEMO()\"')
    expect(csv).toContain('Example ""quoted"" text')
  })
  it('exports self-contained labeled JSON without private document metadata', () => {
    const report = createSyntheticReport('latest')
    expect(report.measurements).toHaveLength(24)
    expect(report.notice).toContain('NOT A MEDICAL RECORD')
    expect(report.profile).toBe('RK')
    expect(report.notice).toMatch(/fictional|synthetic/i)
    expect(report.measurements.some((marker) => marker.id === 'sample-volume')).toBe(false)
    expect(JSON.stringify(report)).not.toMatch(/filename|\.pdf|patientId|laboratoryId/i)
  })
})
