import type { HistoryMarker, HistoryReport, Reading } from '../types'
import { compareReports, reportLabel } from '../lib/history'
import { historyUnit } from '../lib/history-charts'
import { readingStatus } from '../lib/results'
import { StatusBadge } from './ui'

export function ReadingProvenance({ reading }: { reading: Reading }) {
  return <div className="history-provenance">
    <span>{reading.sourceLabel}{reading.page ? ` · source page ${reading.page} (not attached)` : ''}</span>
    {(reading.sourceRaw !== undefined || reading.sourceUnit !== undefined || reading.sourceReference !== undefined) && <span><strong>Original before normalization:</strong> {reading.sourceRaw ?? 'Value not supplied'} {reading.sourceUnit ?? ''}; source reference: {reading.sourceReference ?? 'Not supplied'}. No conversion is performed by this app.</span>}
    {reading.note && <span><strong>Supplied note:</strong> {reading.note}</span>}
  </div>
}

export function HistoryReadings({ marker, reports, personal }: { marker: HistoryMarker; reports: HistoryReport[]; personal: boolean }) {
  return <section className="history-readings-section" aria-label="All sample readings">
    <h3>Every sample, with its own reference</h3>
    <div className="history-reading-scroll" role="region" aria-label={`${marker.name} all-report readings`} tabIndex={0}>
      <table className="history-readings-table">
        <thead><tr><th scope="col">Sample / collection date</th><th scope="col">Raw value / unit</th><th scope="col">Status</th><th scope="col">{personal ? 'Report reference' : 'Illustrative reference'}</th></tr></thead>
        <tbody>{[...reports].sort(compareReports).map((report) => {
          const reading = marker.readings[report.id] ?? null
          return <tr key={report.id} data-history-reading={report.id}>
            <th scope="row">{reportLabel(report)}{report.reportedDate && <small>Reported {report.reportedDate} (not collection)</small>}</th>
            <td><strong>{reading?.raw ?? 'Not reported'}</strong>{reading && <><span className="history-effective-unit">{historyUnit(marker, reading) || 'Unit not supplied'}</span><ReadingProvenance reading={reading} /></>}</td>
            <td><StatusBadge status={readingStatus(reading)} /></td>
            <td>{reading?.reference.label ?? 'No result / no reference'}</td>
          </tr>
        })}</tbody>
      </table>
    </div>
  </section>
}
