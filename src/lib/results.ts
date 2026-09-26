import { groupLabel, reports } from '../data/reports'
import type {
  PairReports, Filters, Marker, NumericReference, ParsedValue, Reading, ReportKey, Status, Trend, ViewMode,
} from '../types'

export const defaultFilters: Filters = {
  query: '', groups: [], status: 'all', trend: 'all', sort: 'priority',
}

export const statusLabels: Record<Status, string> = {
  normal: 'In range',
  high: 'High',
  low: 'Low',
  boundary: 'At cutoff',
  context: 'Context only',
  missing: 'Not reported',
  review: 'Review',
}

export const trendLabels: Record<Trend, string> = {
  returned: 'Back in range',
  toward: 'Toward range',
  away: 'Further from range',
  stable: 'Both in range',
  unchanged: 'No change',
  context: 'Clinical context',
  new: 'New result',
  missing: 'Not in latest',
}

const normalized = (value: string): string => value.trim().toLowerCase().replace(/\s+/g, ' ')
const numericPattern = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/

export function parseValue(raw: string): ParsedValue {
  const value = raw.trim()
  if (numericPattern.test(value)) return { kind: 'exact', value: Number(value) }
  const qualified = value.match(/^([<>])\s*(\d+(?:\.\d+)?)$/)
  if (qualified?.[1] && qualified[2]) {
    return { kind: qualified[1] === '<' ? 'less' : 'greater', value: Number(qualified[2]) }
  }
  const interval = value.match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)$/)
  if (interval?.[1] && interval[2]) {
    const min = Number(interval[1])
    const max = Number(interval[2])
    if (min <= max) return { kind: 'interval', min, max }
  }
  return { kind: 'text', value: normalized(value) }
}

function numericStatus(value: number, reference: NumericReference): Status {
  if (reference.min !== undefined && value < reference.min) return 'low'
  if (reference.max !== undefined && value > reference.max) return 'high'
  if (
    (reference.minExclusive && value === reference.min)
    || (reference.maxExclusive && value === reference.max)
  ) return 'boundary'
  return 'normal'
}

export function readingStatus(reading: Reading | null): Status {
  if (!reading) return 'missing'
  const { reference } = reading
  if (reference.kind === 'context') return 'context'
  if (reference.kind === 'text') {
    return reference.accepted.some((value) => normalized(value) === normalized(reading.raw)) ? 'normal' : 'review'
  }
  const value = parseValue(reading.raw)
  if (value.kind === 'exact') return numericStatus(value.value, reference)
  if (value.kind === 'interval') {
    const start = numericStatus(value.min, reference)
    const end = numericStatus(value.max, reference)
    return start === end ? start : 'review'
  }
  if (value.kind === 'less') {
    if (reference.min !== undefined && value.value <= reference.min) return 'low'
    if (reference.min === undefined && (reference.max === undefined || value.value <= reference.max)) return 'normal'
    return 'review'
  }
  if (value.kind === 'greater') {
    if (reference.max !== undefined && value.value >= reference.max) return 'high'
    if (reference.max === undefined && (reference.min === undefined || value.value >= reference.min)) return 'normal'
    return 'review'
  }
  if (reference.nilIsZero && value.value === 'nil') return numericStatus(0, reference)
  return 'review'
}

export function reportForMode(mode: ViewMode): ReportKey {
  return mode === 'earlier' ? 'earlier' : 'latest'
}

export function needsAttention(status: Status): boolean {
  return ['high', 'low', 'boundary', 'review'].includes(status)
}

export function exactValue(reading: Reading | null): number | null {
  if (!reading) return null
  const value = parseValue(reading.raw)
  return value.kind === 'exact' ? value.value : null
}

export const readingUnit = (marker: Marker, key: ReportKey): string => marker[key]?.unit ?? marker.unit
export const unitsDiffer = (marker: Marker): boolean => Boolean(marker.earlier && marker.latest && readingUnit(marker, 'earlier') !== readingUnit(marker, 'latest'))

export function rangeChanged(marker: Marker): boolean {
  return Boolean(marker.earlier && marker.latest
    && JSON.stringify(marker.earlier.reference) !== JSON.stringify(marker.latest.reference))
}

function distanceFromRange(reading: Reading): number | null {
  const value = exactValue(reading)
  const reference = reading.reference
  if (value === null || reference.kind !== 'numeric') return null
  if (reference.min !== undefined && value < reference.min) return reference.min - value
  if (reference.max !== undefined && value > reference.max) return value - reference.max
  return 0
}

export function getTrend(marker: Marker): Trend {
  const { earlier, latest } = marker
  if (!earlier && !latest) return 'missing'
  if (!earlier) return 'new'
  if (!latest) return 'missing'
  if (unitsDiffer(marker)) return 'context'
  const previous = readingStatus(earlier)
  const current = readingStatus(latest)
  if (previous === 'context' || current === 'context') return 'context'
  if (needsAttention(previous) && current === 'normal') return 'returned'
  if (previous === 'normal' && needsAttention(current)) return 'away'
  if (normalized(earlier.raw) === normalized(latest.raw)) return 'unchanged'
  if (previous === 'normal' && current === 'normal') return 'stable'
  if (!rangeChanged(marker)) {
    const previousDistance = distanceFromRange(earlier)
    const currentDistance = distanceFromRange(latest)
    if (previousDistance !== null && currentDistance !== null) {
      if (currentDistance < previousDistance) return 'toward'
      if (currentDistance > previousDistance) return 'away'
    }
  }
  return 'context'
}

export function formatNumber(value: number, precision = 4): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: precision }).format(value)
}

export interface Change {
  label: string
  detail: string
  amount: number | null
  percent: number | null
  direction: 'up' | 'down' | 'same' | 'none'
}

export function getChange(marker: Marker, metadata: PairReports = reports): Change {
  const none = { amount: null, percent: null, direction: 'none' as const }
  if (!marker.earlier && !marker.latest) return { ...none, label: 'Unavailable', detail: 'Neither selected report contains this measurement' }
  if (!marker.earlier) return { ...none, label: 'New result', detail: `Not reported on ${metadata.earlier.shortDate}` }
  if (!marker.latest) return { ...none, label: 'Not reported', detail: `No ${metadata.latest.shortDate} measurement` }
  if (unitsDiffer(marker)) return { ...none, label: 'Units differ', detail: 'Comparison disabled; no automatic unit conversion' }
  const before = parseValue(marker.earlier.raw)
  const now = parseValue(marker.latest.raw)
  if (before.kind === 'exact' && now.kind === 'exact') {
    const amount = Number((now.value - before.value).toFixed(6))
    const percent = before.value === 0 ? null : (amount / Math.abs(before.value)) * 100
    return {
      amount, percent,
      direction: amount > 0 ? 'up' : amount < 0 ? 'down' : 'same',
      label: amount === 0 ? 'No change' : `${amount > 0 ? '+' : ''}${formatNumber(amount)}`,
      detail: amount === 0 ? 'Same reported value'
        : percent === null ? 'Percentage not defined from zero'
          : `${percent > 0 ? '+' : ''}${formatNumber(percent, 1)}% from earlier`,
    }
  }
  if (before.kind === 'exact' && now.kind === 'less' && now.value <= before.value) {
    return { ...none, direction: 'down', label: 'Lower', detail: 'Exact change not available' }
  }
  if (before.kind === 'exact' && now.kind === 'greater' && now.value >= before.value) {
    return { ...none, direction: 'up', label: 'Higher', detail: 'Exact change not available' }
  }
  if (normalized(marker.earlier.raw) === normalized(marker.latest.raw)) {
    return { ...none, direction: 'same', label: 'Unchanged', detail: 'Same reported result' }
  }
  return { ...none, label: 'See results', detail: 'No exact numeric comparison' }
}

export function displayStatus(marker: Marker, report: ReportKey): string {
  const reading = marker[report]
  const status = readingStatus(reading)
  if (marker.id === 'hscrp' && readingUnit(marker, report) === 'mg/L' && status === 'normal' && reading) {
    const parsed = parseValue(reading.raw)
    if ((parsed.kind === 'less' && parsed.value <= 1) || (parsed.kind === 'exact' && parsed.value < 1)) return 'Low-risk band'
    return 'Average-risk band'
  }
  return statusLabels[status]
}

export function filterMarkers(markers: Marker[], filters: Filters, mode: ViewMode): Marker[] {
  const report = reportForMode(mode)
  const query = normalized(filters.query)
  const filtered = markers.filter((marker) => {
    const status = readingStatus(marker[report])
    const searchText = normalized([
      marker.name, marker.id, groupLabel(marker.group), marker.unit,
      marker.earlier?.sourceLabel, marker.latest?.sourceLabel,
    ].join(' '))
    return (!query || searchText.includes(query))
      && (!filters.groups.length || filters.groups.includes(marker.group))
      && (filters.status === 'all' || (filters.status === 'attention' ? needsAttention(status) : status === filters.status))
      && (mode !== 'compare' || filters.trend === 'all' || getTrend(marker) === filters.trend)
  })
  const rank = (marker: Marker): number => {
    const status = readingStatus(marker[report])
    if (needsAttention(status)) return marker.priority
    if (mode === 'compare' && getTrend(marker) === 'returned') return 200
    if (status === 'normal') return 300
    if (status === 'context') return 400
    return 500
  }
  return filtered.sort((a, b) => {
    if (filters.sort === 'name') return a.name.localeCompare(b.name)
    if (filters.sort === 'group') return groupLabel(a.group).localeCompare(groupLabel(b.group)) || a.name.localeCompare(b.name)
    if (filters.sort === 'change' && mode === 'compare') {
      const aChange = getChange(a).percent
      const bChange = getChange(b).percent
      if (aChange === null && bChange !== null) return 1
      if (aChange !== null && bChange === null) return -1
      return Math.abs(bChange ?? 0) - Math.abs(aChange ?? 0) || a.name.localeCompare(b.name)
    }
    return rank(a) - rank(b) || a.name.localeCompare(b.name)
  })
}

export function summarize(markers: Marker[], report: ReportKey) {
  const count = (status: Status) => markers.filter((marker) => readingStatus(marker[report]) === status).length
  return {
    reported: markers.filter((marker) => marker[report] !== null).length,
    shared: markers.filter((marker) => marker.earlier && marker.latest).length,
    normal: count('normal'),
    high: count('high'),
    low: count('low'),
    boundary: count('boundary'),
    context: count('context'),
    missing: count('missing'),
    attention: markers.filter((marker) => needsAttention(readingStatus(marker[report]))).length,
    returned: markers.filter((marker) => getTrend(marker) === 'returned').length,
  }
}

function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return `"${safe.replace(/"/g, '""')}"`
}

export function createCsv(markers: Marker[], metadata: PairReports = reports, isPersonal = false): string {
  const header = [
    'Dataset', 'Biomarker', 'Category',
    'Earlier report ID', 'Earlier date basis', `${metadata.earlier.date} result`, 'Earlier unit', 'Earlier reference', 'Earlier status', 'Earlier provenance', 'Earlier original value / unit / reference', 'Earlier note',
    'Later report ID', 'Later date basis', `${metadata.latest.date} result`, 'Later unit', 'Latest reference', 'Latest status', 'Latest provenance', 'Later original value / unit / reference', 'Later note',
    'Reported change', 'Change detail', 'Comparison', 'Notes',
  ]
  const rows = markers.map((marker) => {
    const change = getChange(marker, metadata)
    return [
      isPersonal ? 'PERSONAL LOCAL IMPORT - KEEP PRIVATE' : 'SYNTHETIC DEMO - NOT A MEDICAL RECORD', marker.name, groupLabel(marker.group),
      metadata.earlier.id ?? 'earlier', metadata.earlier.collectionDate ? `Collection date${metadata.earlier.collectionTime ? ` / ${metadata.earlier.collectionTime}` : ''}` : 'Collection date not supplied; legacy report date',
      marker.earlier?.raw ?? 'Not reported', readingUnit(marker, 'earlier'), marker.earlier?.reference.label ?? '',
      displayStatus(marker, 'earlier'), marker.earlier?.sourceLabel ?? '',
      [marker.earlier?.sourceRaw, marker.earlier?.sourceUnit, marker.earlier?.sourceReference].filter((value) => value !== undefined).join(' / '), marker.earlier?.note ?? '',
      metadata.latest.id ?? 'latest', metadata.latest.collectionDate ? `Collection date${metadata.latest.collectionTime ? ` / ${metadata.latest.collectionTime}` : ''}` : 'Collection date not supplied; legacy report date',
      marker.latest?.raw ?? 'Not reported', readingUnit(marker, 'latest'), marker.latest?.reference.label ?? '',
      displayStatus(marker, 'latest'), marker.latest?.sourceLabel ?? '',
      [marker.latest?.sourceRaw, marker.latest?.sourceUnit, marker.latest?.sourceReference].filter((value) => value !== undefined).join(' / '), marker.latest?.note ?? '',
      change.label, change.detail, trendLabels[getTrend(marker)], marker.note ?? '',
    ]
  })
  return '\ufeff' + [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')
}
