import { groupLabel } from '../data/reports'
import type { GroupId, HistoryMarker, HistoryReport, Reading, StatusFilter } from '../types'
import { compareReports, reportLabel } from './history'
import { needsAttention, parseValue, readingStatus, statusLabels } from './results'

export const historyUnit = (marker: HistoryMarker, reading: Reading | null): string => reading?.unit ?? marker.unit

export function buildChartAxis(min: number, max: number) {
  const span = max - min || Math.abs(max) || 1
  const roughStep = Math.max(span / 4, Number.MIN_VALUE)
  const power = Math.max(10 ** Math.floor(Math.log10(roughStep)), Number.MIN_VALUE)
  const fraction = roughStep / power
  const factor = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10
  const step = factor * power
  const start = Math.floor(min / step) * step
  const end = Math.ceil(max / step) * step
  const count = Math.max(1, Math.round((end - start) / step))
  const values = Array.from({ length: count + 1 }, (_, index) => start + index * step)
  const decimals = Math.max(0, -Math.floor(Math.log10(step)) + (factor === 2.5 ? 1 : 0))
  const offset = Math.abs(start) / span > 10_000 ? (decimals <= 100 ? Number(start.toFixed(decimals)) : start) : 0
  const displayed = values.map((value) => Math.abs(value - offset) < Math.abs(step) * 1e-8 ? 0 : value - offset)
  const largest = Math.max(...displayed.map(Math.abs))
  const scientific = largest >= 1_000_000 || (largest > 0 && largest < 0.001) || decimals > 3
  const formatter = new Intl.NumberFormat('en', {
    notation: scientific ? 'scientific' : 'standard',
    maximumFractionDigits: scientific ? 3 : Math.min(decimals, 3),
  })
  const ticks = values.map((value, index) => ({
    value,
    label: displayed[index] === 0 ? '0' : formatter.format(displayed[index]!),
  }))
  return {
    min: start, max: end > start ? end : start + step, ticks, offset,
    leftGutter: Math.max(76, Math.max(...ticks.map((tick) => tick.label.length)) * 9 + 24),
  }
}

export function buildHistorySeries(marker: HistoryMarker, reports: HistoryReport[]) {
  const ordered = [...reports].sort(compareReports)
  const samples = ordered.map((report) => {
    const reading = marker.readings[report.id] ?? null
    const parsed = reading ? parseValue(reading.raw) : null
    return {
      report, reading, unit: historyUnit(marker, reading),
      day: Date.parse(`${report.collectionDate ?? report.date}T00:00:00Z`) / 86_400_000,
      value: parsed?.kind === 'exact' && Number.isFinite(parsed.value) ? parsed.value : null,
    }
  })
  const supplied = samples.filter((sample) => sample.reading)
  const units = new Set(supplied.map((sample) => sample.unit))
  const compatible = units.size === 1 && supplied.every((sample) => sample.unit.trim() !== '')
  const blocked = !compatible
    ? 'Units differ or are blank. No comparable line or shared reference axis is drawn; review each source value below.'
    : !samples.some((sample) => sample.value !== null)
      ? 'No exact numeric values to plot. Missing, qualified and qualitative results remain in the reading table.'
      : ''
  const values = samples.flatMap((sample) => [
    ...(sample.value === null ? [] : [sample.value]),
    ...(sample.reading?.reference.kind === 'numeric'
      ? [sample.reading.reference.min, sample.reading.reference.max].filter((value): value is number => value !== undefined && Number.isFinite(value))
      : []),
  ])
  const low = values.length ? Math.min(...values) : 0
  const high = values.length ? Math.max(...values) : 1
  const padding = high > low ? (high - low) * 0.08 : Math.abs(high) * 0.08 || 1
  const firstDay = samples[0]?.day ?? 0
  const lastDay = samples.at(-1)?.day ?? firstDay
  const points = samples.map((sample) => ({
    ...sample,
    x: lastDay === firstDay ? 0.5 : (sample.day - firstDay) / (lastDay - firstDay),
  }))
  const segments = points.flatMap((point, index) => {
    const previous = points[index - 1]
    return !blocked && previous && previous.value !== null && point.value !== null && previous.day < point.day
      ? [{ from: previous, to: point }] : []
  })
  return {
    samples: points, segments, blocked, unit: supplied[0]?.unit ?? marker.unit,
    min: low - padding, max: high + padding,
    exactCount: blocked ? 0 : points.filter((point) => point.value !== null).length,
    duplicateDays: new Set(points.map((point) => point.day)).size !== points.length,
  }
}

export interface HistoryFilters {
  query: string
  groups: GroupId[]
  status: StatusFilter
  presence: 'any' | 'every' | 'missing'
  sort: 'name' | 'attention'
}

export const defaultHistoryFilters: HistoryFilters = { query: '', groups: [], status: 'all', presence: 'any', sort: 'name' }

export function filterHistoryMarkers(markers: HistoryMarker[], reports: HistoryReport[], filters: HistoryFilters): HistoryMarker[] {
  if (!reports.length) return []
  const query = filters.query.trim().toLowerCase()
  const count = (marker: HistoryMarker) => reports.filter((report) => needsAttention(readingStatus(marker.readings[report.id] ?? null))).length
  return markers.filter((marker) => {
    const readings = reports.map((report) => marker.readings[report.id] ?? null)
    const present = readings.filter(Boolean).length
    const presence = filters.presence === 'every' ? present === reports.length : filters.presence === 'missing' ? present < reports.length : present > 0
    const status = filters.status === 'all' || readings.some((reading) => filters.status === 'attention'
      ? needsAttention(readingStatus(reading)) : readingStatus(reading) === filters.status)
    return presence && status
      && (!filters.groups.length || filters.groups.includes(marker.group))
      && (!query || `${marker.id} ${marker.name} ${groupLabel(marker.group)}`.toLowerCase().includes(query))
  }).sort((a, b) => (filters.sort === 'attention' ? count(b) - count(a) : 0) || a.name.localeCompare(b.name))
}

export function historyCsv(markers: HistoryMarker[], reports: HistoryReport[], personal: boolean): string {
  const ordered = [...reports].sort(compareReports)
  const cell = (value: string) => `"${(/^[=+\-@\t\r]/.test(value) ? `'${value}` : value).replace(/"/g, '""')}"`
  const header = ['Dataset', 'Biomarker', 'Category', 'Report ID', 'Sample date / provenance', 'Reported date', 'Raw result', 'Effective unit', 'Status', 'Source-specific reference', 'Source label', 'Source page', 'Original value', 'Original unit', 'Original reference', 'Reading note']
  const rows = markers.flatMap((marker) => ordered.map((report) => {
    const reading = marker.readings[report.id] ?? null
    return [
      personal ? 'PERSONAL LOCAL IMPORT - KEEP PRIVATE' : 'SYNTHETIC DEMO - NOT A MEDICAL RECORD',
      marker.name, groupLabel(marker.group), report.id, reportLabel(report), report.reportedDate ?? '',
      reading?.raw ?? 'Not reported', reading ? historyUnit(marker, reading) : '', statusLabels[readingStatus(reading)],
      reading?.reference.label ?? 'No result', reading?.sourceLabel ?? '', String(reading?.page ?? ''),
      reading?.sourceRaw ?? '', reading?.sourceUnit ?? '', reading?.sourceReference ?? '', reading?.note ?? '',
    ]
  }))
  return '\ufeff' + [header, ...rows].map((row) => row.map(cell).join(',')).join('\r\n')
}
