import type { Dataset, HistoryReport, Marker, PairReports, ReportMetadata } from '../types'

export function compareReports(a: HistoryReport, b: HistoryReport): number {
  return a.date.localeCompare(b.date) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
}

export function collectionLabel(report: ReportMetadata): string {
  return report.collectionDate
    ? `Collected ${report.shortDate}${report.collectionTime ? ` · ${report.collectionTime}` : ''}`
    : `${report.shortDate} · Collection date not supplied; legacy report date`
}

export function reportLabel(report: ReportMetadata): string {
  return `${collectionLabel(report)}${report.laboratory ? ` · ${report.laboratory}` : ''}${report.id ? ` · ${report.id}` : ''}`
}

export function defaultPair(dataset: Dataset): [string, string] {
  const sorted = [...dataset.reports].sort(compareReports)
  return [sorted[0]!.id, sorted[sorted.length - 1]!.id]
}

export function projectDataset(dataset: Dataset, firstId: string, secondId: string) {
  if (firstId === secondId) throw new Error('Choose two distinct reports.')
  const selected = [firstId, secondId].map((id) => dataset.reports.find((report) => report.id === id))
  if (!selected[0] || !selected[1]) throw new Error('The selected report is unavailable.')
  const pair = [selected[0], selected[1]].sort(compareReports)
  const earlier = pair[0]!
  const latest = pair[1]!
  const reports: PairReports = { earlier, latest }
  const markers: Marker[] = dataset.markers.flatMap(({ readings, ...marker }) => {
    const before = readings[earlier.id] ?? null
    const after = readings[latest.id] ?? null
    return before || after ? [{ ...marker, earlier: before, latest: after }] : []
  })
  return { reports, markers, pair: [earlier.id, latest.id] as [string, string], unavailable: dataset.markers.length - markers.length }
}
