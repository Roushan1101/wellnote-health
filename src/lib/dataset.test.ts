import { describe, expect, it } from 'vitest'
import { demoDataset, MAX_DATASET_BYTES, parseDataset, validateDataset } from './dataset'
import { markers } from '../data/markers'
import { person, reports } from '../data/reports'
import { collectionLabel, defaultPair, projectDataset } from './history'
import { createCsv, getChange, getTrend, readingUnit, unitsDiffer } from './results'
import { createSyntheticReport } from './synthetic-report'

const fixture = () => structuredClone(demoDataset)
const legacy = () => structuredClone({ schemaVersion: 1, person, reports, markers })

describe('portable history validation', () => {
  it('validates four fictional samples and all six distinct pair combinations', () => {
    const data = parseDataset(JSON.stringify(demoDataset))
    expect(data.schemaVersion).toBe(2)
    expect(data.reports).toHaveLength(4)
    let pairs = 0
    for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) {
      const pair = projectDataset(data, data.reports[b]!.id, data.reports[a]!.id)
      expect(pair.pair).toEqual([data.reports[a]!.id, data.reports[b]!.id])
      expect(pair.markers.every((marker) => marker.earlier || marker.latest)).toBe(true)
      pairs++
    }
    expect(pairs).toBe(6)
    expect(defaultPair(data)).toEqual(['demo-baseline', 'demo-latest'])
  })
  it('migrates v1 and explicitly does not invent collection dates', () => {
    const migrated = validateDataset(legacy())
    expect(migrated.reports).toHaveLength(2)
    expect(migrated.reports[0]?.collectionDate).toBeUndefined()
    expect(collectionLabel(migrated.reports[0]!)).toContain('Collection date not supplied; legacy report date')
    expect(projectDataset(migrated, ...defaultPair(migrated)).markers).toHaveLength(25)
  })
  it('preserves explicit blank units and per-reading provenance during v1 migration', () => {
    const data = legacy()
    const reading = data.markers[0]!.latest!
    reading.unit = ''
    reading.sourceRaw = reading.raw
    reading.sourceUnit = ''
    reading.sourceReference = 'Fictional original reference text'
    reading.note = 'Fictional legacy source omitted a unit.'
    const migrated = validateDataset(data)
    const pair = projectDataset(migrated, ...defaultPair(migrated))
    const marker = pair.markers[0]!
    expect(marker.latest).toMatchObject({
      unit: '', sourceUnit: '', sourceRaw: reading.raw,
      sourceReference: reading.sourceReference, note: reading.note,
    })
    expect(readingUnit(marker, 'latest')).toBe('')
    expect(getChange(marker, pair.reports).label).toBe('Units differ')
  })
  it('keeps same-day laboratories separate with deterministic ID ordering', () => {
    const data = fixture()
    const first = data.reports[0]!
    const second = data.reports[1]!
    second.date = first.date
    second.collectionDate = first.date
    const valid = validateDataset(data)
    expect(valid.reports).toHaveLength(4)
    expect(projectDataset(valid, second.id, first.id).pair).toEqual([first.id, second.id])
    expect(() => projectDataset(valid, first.id, first.id)).toThrow('distinct')
  })
  it('rejects duplicate IDs and unknown reading keys', () => {
    const data = fixture()
    data.reports[1]!.id = data.reports[0]!.id
    expect(() => validateDataset(data)).toThrow('duplicate report IDs')
    const unknown = fixture()
    unknown.markers[0]!.readings['nonexistent-report'] = null
    expect(() => validateDataset(unknown)).toThrow('unsupported field')
  })
  it('allows sparse histories, missing keys and no predefined marker IDs', () => {
    const data = fixture()
    data.markers = [data.markers[0]!]
    data.markers[0]!.id = 'custom-marker'
    data.markers[0]!.readings = { 'demo-autumn': data.markers[0]!.readings['demo-latest']! }
    const valid = validateDataset(data)
    expect(valid.markers[0]!.readings['demo-baseline']).toBeNull()
    const pair = projectDataset(valid, 'demo-baseline', 'demo-latest')
    expect(pair.markers).toEqual([])
    expect(pair.unavailable).toBe(1)
  })
  it('accepts 2–50 reports but rejects one or more than fifty', () => {
    const tooFew = fixture()
    tooFew.reports = [tooFew.reports[0]!]
    expect(() => validateDataset(tooFew)).toThrow('2–50')
    const tooMany = fixture()
    tooMany.reports = Array.from({ length: 51 }, (_, index) => ({ ...tooMany.reports[0]!, id: `report-${index}` }))
    expect(() => validateDataset(tooMany)).toThrow('2–50')
  })
  it('derives labels from collection date, preserving reported date and local time', () => {
    const data = fixture()
    const first = data.reports[0]!
    first.label = 'Do not use this label'
    first.reportedDate = '2024-02-16'
    first.collectionTime = '11:32 AM'
    const valid = validateDataset(data).reports[0]!
    expect(valid.label).toBe('14 Feb 2024')
    expect(collectionLabel(valid)).toContain('Collected 14 Feb 2024 · 11:32 AM')
    expect(valid.reportedDate).toBe('2024-02-16')
  })
  it('rejects date/collection mismatches, invalid calendar dates and time without collection date', () => {
    const data = fixture()
    data.reports[0]!.collectionDate = '2024-02-15'
    expect(() => validateDataset(data)).toThrow('must equal collectionDate')
    data.reports[0]!.date = '2024-02-30'
    expect(() => validateDataset(data)).toThrow('valid calendar date')
    data.reports[0]!.date = '2024-02-14'
    delete data.reports[0]!.collectionDate
    expect(() => validateDataset(data)).toThrow('provide collectionDate')
  })
  it('accepts optional display fields being absent and legacy string years', () => {
    const data = JSON.parse(JSON.stringify(fixture()))
    delete data.reports[0].label
    delete data.reports[0].shortDate
    delete data.reports[0].fullDate
    data.reports[0].year = '2024'
    expect(validateDataset(data).reports[0]).toMatchObject({ year: 2024, shortDate: '14 Feb 2024' })
    data.reports[0].year = '2024 invalid'
    expect(() => validateDataset(data)).toThrow('reports[0].year')
  })
  it('preserves original conversion provenance, effective units and per-reading notes', () => {
    const valid = validateDataset(fixture())
    const platelets = valid.markers.find((marker) => marker.id === 'platelets')!
    expect(platelets.readings['demo-autumn']).toMatchObject({ sourceRaw: '2.4', sourceUnit: '10⁵/µL', sourceReference: '1.5–4.5' })
    const pair = projectDataset(valid, 'demo-baseline', 'demo-spring')
    const iron = pair.markers.find((marker) => marker.id === 'iron')!
    expect(readingUnit(iron, 'latest')).toBe('µmol/L')
    expect(unitsDiffer(iron)).toBe(true)
    expect(getChange(iron, pair.reports)).toMatchObject({ label: 'Units differ', amount: null, percent: null })
    expect(getTrend(iron)).toBe('context')
  })
  it('does not call a marker missing in both samples new', () => {
    const marker = { ...markers[0]!, earlier: null, latest: null }
    expect(getChange(marker).label).toBe('Unavailable')
    expect(getTrend(marker)).not.toBe('new')
  })
  it('exports only selected pair and labels units, IDs, dates and source provenance', () => {
    const pair = projectDataset(fixture(), 'demo-spring', 'demo-autumn')
    const csv = createCsv(pair.markers, pair.reports, true)
    expect(csv).toContain('2024-06-14 result')
    expect(csv).toContain('2024-10-14 result')
    expect(csv).toContain('demo-spring')
    expect(csv).toContain('Collection date')
    expect(csv).toContain('µmol/L')
    expect(csv).toContain('2.4 / 10⁵/µL / 1.5–4.5')
    expect(csv).not.toContain('2025-02-14 result')
    expect(createSyntheticReport('demo-autumn').report.id).toBe('demo-autumn')
  })
  it('rejects malformed JSON, unsupported versions and oversized payloads', () => {
    expect(() => parseDataset('%PDF-example')).toThrow('invalid JSON')
    expect(() => parseDataset(' '.repeat(MAX_DATASET_BYTES + 1))).toThrow('maximum size')
    expect(() => validateDataset({ ...fixture(), schemaVersion: 3 })).toThrow('schemaVersion')
  })
  it('rejects prototype keys, duplicate markers, bad groups and unknown fields', () => {
    const data = JSON.parse(JSON.stringify(fixture()))
    data.markers[0].group = 'invalid'
    expect(() => validateDataset(data)).toThrow('unknown health category')
    data.markers[0].group = 'heart'
    data.markers.push(data.markers[0])
    expect(() => validateDataset(data)).toThrow('duplicate ID')
    expect(() => parseDataset(JSON.stringify(fixture()).replace('"schemaVersion":2', '"schemaVersion":2,"__proto__":{}'))).toThrow('unsupported field')
  })
  it('rejects nonfinite/inverted references, invalid flags and empty histories', () => {
    const data = fixture()
    data.markers[0]!.readings['demo-latest']!.reference = { kind: 'numeric', label: 'test', max: Infinity }
    expect(() => validateDataset(data)).toThrow('finite')
    data.markers[0]!.readings['demo-latest']!.reference = { kind: 'numeric', label: 'test', min: 8, max: 2 }
    expect(() => validateDataset(data)).toThrow('min must not exceed max')
    const flags = JSON.parse(JSON.stringify(fixture()))
    flags.markers[0].readings['demo-latest'].reference.maxExclusive = 'true'
    expect(() => validateDataset(flags)).toThrow('expected true or false')
    data.markers[0]!.readings = {}
    expect(() => validateDataset(data)).toThrow('at least one report')
  })
  it('checks source page limits, age bounds and matching years', () => {
    const data = fixture()
    data.reports[0]!.pages = 1
    data.markers[0]!.readings['demo-baseline']!.page = 2
    expect(() => validateDataset(data)).toThrow('page')
    delete data.markers[0]!.readings['demo-baseline']!.page
    data.person.latestReportedAge = 140
    expect(() => validateDataset(data)).toThrow('latestReportedAge')
    delete data.person.latestReportedAge
    data.reports[0]!.year = 2020
    expect(() => validateDataset(data)).toThrow('must match')
  })
})
