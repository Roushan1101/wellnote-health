import { markers } from '../data/markers'
import { person, reports } from '../data/reports'
import type { Dataset, Marker, Person, Reading, Reference, ReportMetadata } from '../types'

export const MAX_DATASET_BYTES = 2 * 1024 * 1024
export const requiredMarkerIds = [
  'vitamin-d', 'vitamin-b12', 'iron', 'magnesium', 'total-cholesterol', 'ldl', 'hdl',
  'non-hdl', 'hdl-ldl-ratio', 'triglycerides', 'hscrp', 'ggt', 'lymphocytes',
] as const

export const demoDataset: Dataset = { schemaVersion: 1, person, reports, markers }

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
  const input = object(value, path, ['raw', 'page', 'reference', 'sourceLabel'])
  const result: Reading = {
    raw: text(input.raw, `${path}.raw`, 160),
    sourceLabel: text(input.sourceLabel, `${path}.sourceLabel`),
    reference: reference(input.reference, `${path}.reference`),
  }
  if (input.page !== undefined) result.page = number(input.page, `${path}.page`, 1, pages ?? 1000, true)
  return result
}

function report(value: unknown, path: string): ReportMetadata {
  const input = object(value, path, ['id', 'date', 'label', 'fullDate', 'shortDate', 'year', 'pages', 'filename', 'age'])
  const date = text(input.date, `${path}.date`, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) {
    fail(`${path}.date`, 'use a valid calendar date in YYYY-MM-DD format.')
  }
  const result: ReportMetadata = {
    date, label: text(input.label, `${path}.label`),
    fullDate: text(input.fullDate, `${path}.fullDate`), shortDate: text(input.shortDate, `${path}.shortDate`),
  }
  for (const key of ['id', 'filename'] as const) {
    if (input[key] !== undefined) result[key] = text(input[key], `${path}.${key}`)
  }
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
  if (input.schemaVersion !== 1) fail('schemaVersion', 'expected 1. Export a version 1 Wellnote dataset.')
  const profile = object(input.person, 'person', ['name', 'firstName', 'initials', 'latestReportedAge', 'reportedSex'])
  const person: Person = { name: text(profile.name, 'person.name', 160), initials: text(profile.initials, 'person.initials', 12) }
  for (const key of ['firstName', 'reportedSex'] as const) {
    if (profile[key] !== undefined) person[key] = text(profile[key], `person.${key}`, 160)
  }
  if (profile.latestReportedAge !== undefined) person.latestReportedAge = number(profile.latestReportedAge, 'person.latestReportedAge', 0, 130, true)
  const pair = object(input.reports, 'reports', ['earlier', 'latest'])
  const reports = { earlier: report(pair.earlier, 'reports.earlier'), latest: report(pair.latest, 'reports.latest') }
  if (reports.latest.date <= reports.earlier.date) fail('reports', 'latest.date must be later than earlier.date.')
  if (!Array.isArray(input.markers) || input.markers.length < 1 || input.markers.length > 500) fail('markers', 'provide 1–500 measurements.')
  const seen = new Set<string>()
  const markers: Marker[] = input.markers.map((value, index) => {
    const path = `markers[${index}]`
    const item = object(value, path, ['id', 'name', 'group', 'unit', 'earlier', 'latest', 'note', 'priority'])
    const id = text(item.id, `${path}.id`, 100)
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) fail(`${path}.id`, 'use lowercase letters, digits and hyphens.')
    if (seen.has(id)) fail(`${path}.id`, `duplicate ID: ${id}.`)
    seen.add(id)
    const group = text(item.group, `${path}.group`)
    if (!['heart', 'nutrition', 'blood', 'liver', 'kidney', 'glucose', 'thyroid', 'urine'].includes(group)) fail(`${path}.group`, 'unknown health category.')
    const result: Marker = {
      id, name: text(item.name, `${path}.name`, 160), group: group as Marker['group'],
      unit: text(item.unit, `${path}.unit`, 80, true),
      priority: number(item.priority, `${path}.priority`, 0, 10000, true),
      earlier: reading(item.earlier, `${path}.earlier`, reports.earlier.pages),
      latest: reading(item.latest, `${path}.latest`, reports.latest.pages),
    }
    if (!result.earlier && !result.latest) fail(path, 'at least one report must contain a reading.')
    if (item.note !== undefined) result.note = text(item.note, `${path}.note`, 4000, true)
    return result
  })
  const missing = requiredMarkerIds.filter((id) => !seen.has(id))
  if (missing.length) fail('markers', `missing required IDs: ${missing.join(', ')}. Include these markers; one reading may be null.`)
  return { schemaVersion: 1, person, reports, markers }
}

export function parseDataset(json: string): Dataset {
  if (new TextEncoder().encode(json).byteLength > MAX_DATASET_BYTES) fail('file', 'maximum size is 2 MiB.')
  let parsed: unknown
  try { parsed = JSON.parse(json) } catch { return fail('file', 'invalid JSON. Choose a Wellnote version 1 JSON export, not a PDF.') }
  return validateDataset(parsed)
}
