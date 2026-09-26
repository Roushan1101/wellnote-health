import { Download, Printer, RotateCcw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useDataset } from '../DatasetContext'
import { groups, groupLabel } from '../data/reports'
import { compareReports, reportLabel } from '../lib/history'
import { defaultHistoryFilters, filterHistoryMarkers, historyCsv, historyUnit, type HistoryFilters } from '../lib/history-charts'
import { readingStatus } from '../lib/results'
import type { HistoryMarker, HistoryReport, StatusFilter } from '../types'
import { ReadingProvenance } from './HistoryReadings'
import { StatusBadge } from './ui'
import '../charts.css'

const statuses: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Any status' }, { value: 'attention', label: 'Needs review' },
  { value: 'high', label: 'High' }, { value: 'low', label: 'Low' },
  { value: 'boundary', label: 'At cutoff' }, { value: 'normal', label: 'In range' },
  { value: 'context', label: 'Context only' }, { value: 'missing', label: 'Not reported' },
  { value: 'review', label: 'Review / uncertain' },
]

function AllReportPrint({ rows, reports, personal }: { rows: HistoryMarker[]; reports: HistoryReport[]; personal: boolean }) {
  return createPortal(<section className="all-report-print" aria-label="Printable all-report comparison">
    <h1>Wellnote / all-report comparison</h1>
    <p><strong>{personal ? 'PRIVATE HEALTH DATA — LOCAL IMPORT. Keep this printout private.' : 'SYNTHETIC DEMO — NOT A MEDICAL RECORD.'}</strong></p>
    <p>{rows.length} matching biomarkers across {reports.length} selected reports. Status and reference are source-specific; no diagnosis or treatment is prescribed.</p>
    {rows.map((marker) => <article key={marker.id}><h2>{marker.name} / {groupLabel(marker.group)}</h2>
      <table><thead><tr><th>Sample date and source</th><th>Raw value / unit</th><th>Status</th><th>{personal ? 'Report reference' : 'Illustrative reference'}</th></tr></thead>
        <tbody>{reports.map((report) => {
          const reading = marker.readings[report.id] ?? null
          return <tr key={report.id}><td>{reportLabel(report)}</td><td>{reading ? `${reading.raw} ${historyUnit(marker, reading) || '(unit not supplied)'}` : 'Not reported'}{reading && <ReadingProvenance reading={reading} />}</td><td><StatusBadge status={readingStatus(reading)} /></td><td>{reading?.reference.label ?? 'No result'}</td></tr>
        })}</tbody></table>
    </article>)}
  </section>, document.body)
}

export function AllReportsComparison({ onOpen }: { onOpen: (marker: HistoryMarker) => void }) {
  const { dataset, allReports, isPersonal } = useDataset()
  const [selectedIds, setSelectedIds] = useState(() => allReports.map((report) => report.id))
  const [filters, setFilters] = useState<HistoryFilters>({ ...defaultHistoryFilters, groups: [] })
  const [notice, setNotice] = useState('')
  const reports = useMemo(() => allReports.filter((report) => selectedIds.includes(report.id)).sort(compareReports), [allReports, selectedIds])
  const filtered = useMemo(() => filterHistoryMarkers(dataset.markers, reports, filters), [dataset.markers, reports, filters])
  const update = (patch: Partial<HistoryFilters>) => setFilters((current) => ({ ...current, ...patch }))
  const reset = () => {
    setFilters({ ...defaultHistoryFilters, groups: [] })
    setSelectedIds(allReports.map((report) => report.id))
    setNotice('')
  }
  const exportCsv = () => {
    const url = URL.createObjectURL(new Blob([historyCsv(filtered, reports, isPersonal)], { type: 'text/csv;charset=utf-8;' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `wellnote-${isPersonal ? 'personal' : 'synthetic'}-all-report-comparison.csv`
    document.body.append(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    setNotice(`Exported ${filtered.length} biomarkers across ${reports.length} reports. ${isPersonal ? 'This file contains private health data.' : 'All values are synthetic.'}`)
  }
  return <div className="all-reports-comparison">
    <section className="panel history-comparison-controls" aria-label="All-report comparison filters">
      <div className="section-heading"><div><h2>All reports, side by side.</h2><p>Every cell uses its own source status, reference and unit. This view is independent of the two-report selection.</p></div>
        <div className="history-comparison-actions"><button className="button secondary-button" onClick={() => window.print()} disabled={!filtered.length}><Printer size={16} />Print all-report view</button><button className="button primary-button" onClick={exportCsv} disabled={!filtered.length}><Download size={16} />Export all-report CSV</button></div>
      </div>
      <fieldset className="history-report-slicers"><legend>Reports to compare — ordered by sample collection date</legend>
        {allReports.map((report) => <label key={report.id}><input type="checkbox" checked={selectedIds.includes(report.id)} onChange={() => setSelectedIds((ids) => ids.includes(report.id) ? ids.filter((id) => id !== report.id) : [...ids, report.id])} aria-label={`Include report ${report.id}`} /><span>{reportLabel(report)}</span></label>)}
      </fieldset>
      <div className="history-filter-controls">
        <label>Search all-report biomarkers<input aria-label="Search all-report biomarkers" value={filters.query} placeholder="Search name or category…" onChange={(event) => update({ query: event.target.value })} /></label>
        <label>Status in any selected report<select aria-label="All-report status" value={filters.status} onChange={(event) => update({ status: event.target.value as StatusFilter })}>{statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></label>
        <label>Reading availability<select aria-label="All-report availability" value={filters.presence} onChange={(event) => update({ presence: event.target.value as HistoryFilters['presence'] })}><option value="any">Present in any selected report</option><option value="every">Present in every selected report</option><option value="missing">Missing in at least one report</option></select></label>
        <label>Sort<select aria-label="All-report sort" value={filters.sort} onChange={(event) => update({ sort: event.target.value as HistoryFilters['sort'] })}><option value="name">Name A–Z</option><option value="attention">Most review flags (not a health score)</option></select></label>
      </div>
      <div className="history-category-slicers" aria-label="All-report categories">
        <button className="button secondary-button" aria-pressed={!filters.groups.length} onClick={() => update({ groups: [] })}>All categories</button>
        {groups.map((group) => <button key={group.id} className="button secondary-button" aria-pressed={filters.groups.includes(group.id)} onClick={() => update({ groups: filters.groups.includes(group.id) ? filters.groups.filter((id) => id !== group.id) : [...filters.groups, group.id] })}>{group.label}</button>)}
        <button className="button secondary-button" onClick={reset}><RotateCcw size={15} />Reset all-report filters</button>
      </div>
      <p className="history-comparison-count" role="status">{filtered.length} of {dataset.markers.length} biomarkers across {reports.length} of {allReports.length} reports.</p>
      {!reports.length && <p role="alert">Select at least one report to display its readings.</p>}
      {notice && <p role="status">{notice}</p>}
    </section>
    {filtered.length > 0 ? <section className="panel history-matrix-panel">
      <div className="history-matrix-scroll" role="region" aria-label="All reports comparison table; scroll horizontally to see all reports" tabIndex={0}>
        <table className="history-matrix">
          <caption>All selected samples, not a pair-only view. Select a biomarker to open its complete history chart.</caption>
          <thead><tr><th scope="col">Biomarker</th>{reports.map((report) => <th key={report.id} scope="col" data-comparison-report={report.id}>{reportLabel(report)}{report.reportedDate && <small>Reported {report.reportedDate} (not collection)</small>}</th>)}</tr></thead>
          <tbody>{filtered.map((marker) => <tr key={marker.id} data-history-marker={marker.id}><th scope="row"><button className="history-marker-button" onClick={() => onOpen(marker)} aria-label={`Open ${marker.name} all-report details`}>{marker.name}</button><small>{groupLabel(marker.group)}</small></th>
            {reports.map((report) => {
              const reading = marker.readings[report.id] ?? null
              return <td key={report.id} data-comparison-reading={report.id}><strong>{reading?.raw ?? 'Not reported'}</strong>{reading && <span className="history-effective-unit">{historyUnit(marker, reading) || 'Unit not supplied'}</span>}<StatusBadge status={readingStatus(reading)} /><p className="history-cell-reference"><span>{isPersonal ? 'Report reference' : 'Illustrative reference'}:</span> {reading?.reference.label ?? 'No result'}</p>
                {reading && <details className="history-cell-provenance"><summary>Source context</summary><ReadingProvenance reading={reading} /></details>}
              </td>
            })}
          </tr>)}</tbody>
        </table>
      </div>
    </section> : <section className="panel history-comparison-empty"><h2>No matching all-report biomarkers</h2><p>Choose reports or adjust the search, category, availability or status filters.</p></section>}
    <AllReportPrint rows={filtered} reports={reports} personal={isPersonal} />
  </div>
}
