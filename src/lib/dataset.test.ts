import { describe, expect, it } from 'vitest'
import { demoDataset, MAX_DATASET_BYTES, parseDataset, requiredMarkerIds, validateDataset } from './dataset'
import { createCsv, getChange } from './results'
import { createSyntheticReport } from './synthetic-report'

const fixture = () => structuredClone(demoDataset)

describe('strict portable dataset validation', () => {
  it('accepts the synthetic template and returns independent, typed data', () => {
    const validated = parseDataset(JSON.stringify(demoDataset))
    expect(validated).toEqual(demoDataset)
    expect(validated).not.toBe(demoDataset)
  })
  it('accepts original-format optional metadata and page provenance', () => {
    const data = fixture()
    data.person = { name: 'Taylor Example', initials: 'TE', firstName: 'Taylor', latestReportedAge: 36, reportedSex: 'Not specified' }
    data.reports.latest = { ...data.reports.latest, id: 'test-latest', year: 2025, pages: 12, filename: 'fictional-source.pdf', age: 36 }
    data.markers[0]!.latest!.page = 5
    expect(validateDataset(data)).toEqual(data)
  })
  it('rejects unsupported versions and unknown top-level keys', () => {
    expect(() => validateDataset({ ...fixture(), schemaVersion: 2 })).toThrow('schemaVersion')
    expect(() => validateDataset({ ...fixture(), uploadUrl: 'not-supported' })).toThrow('unsupported field')
  })
  it('rejects malformed JSON, PDFs and oversized strings', () => {
    expect(() => parseDataset('%PDF-example')).toThrow('invalid JSON')
    expect(() => parseDataset('{')).toThrow('invalid JSON')
    expect(() => parseDataset(' '.repeat(MAX_DATASET_BYTES + 1))).toThrow('maximum size')
  })
  it('reports exact missing required IDs', () => {
    const data = fixture()
    data.markers = data.markers.filter((marker) => marker.id !== 'iron' && marker.id !== 'ldl')
    expect(() => validateDataset(data)).toThrow('missing required IDs: iron, ldl')
    expect(requiredMarkerIds).toHaveLength(13)
  })
  it('rejects duplicate IDs and malformed categories', () => {
    const data = fixture()
    data.markers.push(data.markers[0]!)
    expect(() => validateDataset(data)).toThrow('duplicate ID')
    const bad = JSON.parse(JSON.stringify(fixture()))
    bad.markers[0].group = 'unrecognized'
    expect(() => validateDataset(bad)).toThrow('unknown health category')
  })
  it('rejects an invalid date or reverse chronology', () => {
    const data = fixture()
    data.reports.latest.date = '2025-02-30'
    expect(() => validateDataset(data)).toThrow('valid calendar date')
    data.reports.latest.date = '2020-01-01'
    expect(() => validateDataset(data)).toThrow('must be later')
  })
  it('rejects nonfinite references, inverted ranges and untyped flags', () => {
    const data = fixture()
    data.markers[0]!.latest!.reference = { kind: 'numeric', label: 'Test', max: Infinity }
    expect(() => validateDataset(data)).toThrow('finite')
    data.markers[0]!.latest!.reference = { kind: 'numeric', label: 'Test', min: 8, max: 2 }
    expect(() => validateDataset(data)).toThrow('min must not exceed max')
    const bad = JSON.parse(JSON.stringify(fixture()))
    bad.markers[0].latest.reference.maxExclusive = 'true'
    expect(() => validateDataset(bad)).toThrow('expected true or false')
  })
  it('rejects reading page numbers beyond the supplied report length', () => {
    const data = fixture()
    data.reports.latest.pages = 4
    data.markers[0]!.latest!.page = 5
    expect(() => validateDataset(data)).toThrow('markers[0].latest.page')
  })
  it('rejects invalid typed metadata and impossible ages', () => {
    const data = fixture()
    data.person.latestReportedAge = 150
    expect(() => validateDataset(data)).toThrow('latestReportedAge')
    delete data.person.latestReportedAge
    data.reports.latest.year = 2020
    expect(() => validateDataset(data)).toThrow('must match the date')
  })
  it('normalizes a four-digit string year from portable legacy metadata', () => {
    const data = JSON.parse(JSON.stringify(fixture()))
    data.reports.earlier.year = '2024'
    expect(validateDataset(data).reports.earlier.year).toBe(2024)
    data.reports.earlier.year = '2024 trailing text'
    expect(() => validateDataset(data)).toThrow('reports.earlier.year')
  })
  it('rejects unsupported nested properties and prototype keys', () => {
    const data = JSON.parse(JSON.stringify(fixture()))
    data.markers[0].latest.reference.extra = true
    expect(() => validateDataset(data)).toThrow('unsupported field')
    const polluted = JSON.stringify(fixture()).replace('"schemaVersion":1', '"schemaVersion":1,"__proto__":{"injected":true}')
    expect(() => parseDataset(polluted)).toThrow('unsupported field')
    expect(Object.prototype).not.toHaveProperty('injected')
  })
  it('requires a reading in at least one report and valid reference shape', () => {
    const data = fixture()
    data.markers[0]!.earlier = null
    data.markers[0]!.latest = null
    expect(() => validateDataset(data)).toThrow('at least one report')
    const invalid = JSON.parse(JSON.stringify(fixture()))
    invalid.markers[0].latest.reference = { kind: 'text', label: 'Test', accepted: [] }
    expect(() => validateDataset(invalid)).toThrow('accepted text values')
  })
  it('does not require optional UI markers but does require core charts', () => {
    const data = fixture()
    data.markers = data.markers.filter((marker) => marker.id !== 'alt')
    expect(validateDataset(data).markers).toHaveLength(24)
  })
  it('uses supplied metadata and personal labels in downloads', () => {
    const data = fixture()
    data.reports.earlier.shortDate = 'Earlier imported date'
    data.reports.latest.date = '2030-02-14'
    const magnesium = data.markers.find((marker) => marker.id === 'magnesium')!
    expect(getChange(magnesium, data.reports).detail).toContain('Earlier imported date')
    const csv = createCsv([magnesium], data.reports, true)
    expect(csv).toContain('2030-02-14 result')
    expect(csv).toContain('PERSONAL LOCAL IMPORT')
    expect(csv).not.toContain('SYNTHETIC DEMO')
    const report = createSyntheticReport('latest', data, true)
    expect(report.notice).toContain('KEEP PRIVATE')
    expect(report.provenance).toContain('No original PDF')
  })
})
