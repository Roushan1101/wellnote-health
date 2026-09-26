import type { Dataset, HistoryMarker, HistoryReport, Marker, Person, Reading, Reference } from '../types'
import { compareReports } from './history'
export { demoDataset } from '../data/history'

export const MAX_DATASET_BYTES = 2 * 1024 * 1024

function fail(path: string, message: string): never {
  throw new Error(`${path}: ${message}`)
}

function object(value: unknown, path: string, allowed: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    return fail(path, 'expected a JSON object.')
  }
  const result = value as Record<string, unknown>
  const extra = Object.keys(result).filter((key) => !allowed.includes(key))
  if (extra.length) fail(path, `unsupported field(s): ${extra.join(', ')}.`)
  return result
}

function text(value: unknown, path: string, max = 400, allowEmpty = false): string {
  if (typeof value !== 'string' || (!allowEmpty && !value.trim()) || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) {
    return fail(path, `expected ${allowEmpty ? 'a' : 'a non-empty'} text value of at most ${max} characters.`)
  }
  return value
}

function number(value: unknown, path: string, min = -1e12, max = 1e12, integer = false): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) {
    return fail(path, `expected a finite ${integer ? 'integer' : 'number'} from ${min} to ${max}.`)
  }
  return value
}

function reference(value: unknown, path: string): Reference {
  const input = object(value, path, ['kind', 'label', 'min', 'max', 'minExclusive', 'maxExclusive', 'nilIsZero', 'accepted'])
  const label = text(input.label, `${path}.label`)
  if (input.kind === 'context') {
    object(input, path, ['kind', 'label'])
    return { kind: 'context', label }
  }
  if (input.kind === 'text') {
    object(input, path, ['kind', 'label', 'accepted'])
    if (!Array.isArray(input.accepted) || input.accepted.length < 1 || input.accepted.length > 30) fail(`${path}.accepted`, 'provide 1–30 accepted text values.')
    return { kind: 'text', label, accepted: input.accepted.map((item, index) => text(item, `${path}.accepted[${index}]`, 160)) }
  }
  if (input.kind !== 'numeric') fail(`${path}.kind`, 'expected numeric, text, or context.')
  object(input, path, ['kind', 'label', 'min', 'max', 'minExclusive', 'maxExclusive', 'nilIsZero'])
  const result: Reference = { kind: 'numeric', label }
  for (const key of ['min', 'max'] as const) {
    if (input[key] !== undefined) result[key] = number(input[key], `${path}.${key}`)
  }
  if (result.min === undefined && result.max === undefined) fail(path, 'numeric references need a min or max; use context for unscored readings.')
  if (result.min !== undefined && result.max !== undefined && result.min > result.max) fail(path, 'min must not exceed max.')
  for (const key of ['minExclusive', 'maxExclusive', 'nilIsZero'] as const) {
    if (input[key] !== undefined) {
      if (typeof input[key] !== 'boolean') fail(`${path}.${key}`, 'expected true or false.')
      result[key] = input[key]
    }
  }
  return result
}

function reading(value: unknown, path: string, pages?: number): Reading | null {
  if (value === null) return null
  const input = object(value, path, ['raw', 'page', 'reference', 'sourceLabel', 'unit', 'sourceRaw', 'sourceUnit', 'sourceReference', 'note'])
  const result: Reading = {
    raw: text(input.raw, `${path}.raw`, 160),
    sourceLabel: text(input.sourceLabel, `${path}.sourceLabel`),
    reference: reference(input.reference, `${path}.reference`),
  }
  if (input.page !== undefined) result.page = number(input.page, `${path}.page`, 1, pages ?? 1000, true)
  for (const key of ['unit', 'sourceRaw', 'sourceUnit', 'sourceReference', 'note'] as const) {
    if (input[key] !== undefined) result[key] = text(input[key], `${path}.${key}`, key === 'note' ? 4000 : 400, key === 'unit' || key === 'sourceUnit')
  }
  return result
}

function calendarDate(value: unknown, path: string): string {
  const date = text(value, path, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) {
    fail(path, 'use a valid calendar date in YYYY-MM-DD format.')
  }
  return date
}

function report(value: unknown, path: string, legacyId?: string): HistoryReport {
  const input = object(value, path, ['id', 'date', 'label', 'fullDate', 'shortDate', 'year', 'pages', 'filename', 'age', 'collectionDate', 'collectionTime', 'reportedDate', 'laboratory', 'note'])
  const date = calendarDate(input.date, `${path}.date`)
  const id = input.id === undefined && legacyId ? legacyId : text(input.id, `${path}.id`, 100)
  if (['__proto__', 'prototype', 'constructor'].includes(id)) fail(`${path}.id`, 'reserved report ID.')
  const parsed = new Date(`${date}T00:00:00Z`)
  const shortDate = parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
  const fullDate = parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
  const result: HistoryReport = {
    id, date, label: shortDate, fullDate, shortDate,
  }
  for (const key of ['label', 'shortDate', 'fullDate'] as const) {
    if (input[key] !== undefined) text(input[key], `${path}.${key}`)
  }
  for (const key of ['filename', 'collectionTime', 'laboratory', 'note'] as const) {
    if (input[key] !== undefined) result[key] = text(input[key], `${path}.${key}`, key === 'note' ? 4000 : 400)
  }
  if (input.collectionDate !== undefined) {
    result.collectionDate = calendarDate(input.collectionDate, `${path}.collectionDate`)
    if (result.collectionDate !== date) fail(`${path}.date`, 'must equal collectionDate when collectionDate is supplied.')
  }
  if (input.collectionTime !== undefined && !result.collectionDate) fail(`${path}.collectionTime`, 'provide collectionDate with a collection time.')
  if (input.reportedDate !== undefined) result.reportedDate = calendarDate(input.reportedDate, `${path}.reportedDate`)
  if (input.year !== undefined) {
    const year = typeof input.year === 'string' && /^\d{4}$/.test(input.year) ? Number(input.year) : input.year
    result.year = number(year, `${path}.year`, 1, 9999, true)
    if (result.year !== Number(date.slice(0, 4))) fail(`${path}.year`, 'must match the date year.')
  }
  if (input.pages !== undefined) result.pages = number(input.pages, `${path}.pages`, 1, 1000, true)
  if (input.age !== undefined) result.age = number(input.age, `${path}.age`, 0, 130, true)
  return result
}

export function validateDataset(value: unknown): Dataset {
  const input = object(value, 'dataset', ['schemaVersion', 'person', 'reports', 'markers'])
  if (input.schemaVersion !== 1 && input.schemaVersion !== 2) fail('schemaVersion', 'expected 1 or 2. Export a supported Wellnote dataset.')
  const profile = object(input.person, 'person', ['name', 'firstName', 'initials', 'latestReportedAge', 'reportedSex'])
  const person: Person = { name: text(profile.name, 'person.name', 160), initials: text(profile.initials, 'person.initials', 12) }
  for (const key of ['firstName', 'reportedSex'] as const) {
    if (profile[key] !== undefined) person[key] = text(profile[key], `person.${key}`, 160)
  }
  if (profile.latestReportedAge !== undefined) person.latestReportedAge = number(profile.latestReportedAge, 'person.latestReportedAge', 0, 130, true)
  const legacy = input.schemaVersion === 1
  let reports: HistoryReport[]
  if (legacy) {
    const pair = object(input.reports, 'reports', ['earlier', 'latest'])
    reports = [report(pair.earlier, 'reports.earlier', 'legacy-earlier'), report(pair.latest, 'reports.latest', 'legacy-latest')]
  } else {
    if (!Array.isArray(input.reports) || input.reports.length < 2 || input.reports.length > 50) fail('reports', 'provide 2–50 reports.')
    reports = input.reports.map((value, index) => report(value, `reports[${index}]`))
  }
  if (new Set(reports.map((item) => item.id)).size !== reports.length) fail('reports', 'duplicate report IDs; each sample needs a unique ID, even on the same date.')
  if (!Array.isArray(input.markers) || input.markers.length < 1 || input.markers.length > 500) fail('markers', 'provide 1–500 measurements.')
  const seen = new Set<string>()
  const markers: HistoryMarker[] = input.markers.map((value, index) => {
    const path = `markers[${index}]`
    const item = object(value, path, ['id', 'name', 'group', 'unit', ...(legacy ? ['earlier', 'latest'] : ['readings']), 'note', 'priority'])
    const id = text(item.id, `${path}.id`, 100)
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) fail(`${path}.id`, 'use lowercase letters, digits and hyphens.')
    if (seen.has(id)) fail(`${path}.id`, `duplicate ID: ${id}.`)
    seen.add(id)
    const group = text(item.group, `${path}.group`)
    if (!['heart', 'nutrition', 'blood', 'liver', 'kidney', 'glucose', 'thyroid', 'urine'].includes(group)) fail(`${path}.group`, 'unknown health category.')
    const readings = legacy
      ? { [reports[0]!.id]: item.earlier, [reports[1]!.id]: item.latest }
      : object(item.readings, `${path}.readings`, reports.map((report) => report.id))
    const result: HistoryMarker = {
      id, name: text(item.name, `${path}.name`, 160), group: group as Marker['group'],
      unit: text(item.unit, `${path}.unit`, 80, true),
      priority: number(item.priority, `${path}.priority`, 0, 10000, true),
      readings: Object.fromEntries(reports.map((report) => [report.id, reading(Object.hasOwn(readings, report.id) ? readings[report.id] ?? null : null, `${path}.readings.${report.id}`, report.pages)])),
    }
    if (!Object.values(result.readings).some(Boolean)) fail(path, 'at least one report must contain a reading.')
    if (item.note !== undefined) result.note = text(item.note, `${path}.note`, 4000, true)
    return result
  })
  return { schemaVersion: 2, person, reports: reports.sort(compareReports), markers }
}

export function parseDataset(json: string): Dataset {
  if (new TextEncoder().encode(json).byteLength > MAX_DATASET_BYTES) fail('file', 'maximum size is 2 MiB.')
  let parsed: unknown
  try { parsed = JSON.parse(json) } catch { return fail('file', 'invalid JSON. Choose a Wellnote version 1 or 2 JSON export, not a PDF.') }
  return validateDataset(parsed)
}
