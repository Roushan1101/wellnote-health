import { groupLabel } from '../data/reports'
import { useDataset } from '../DatasetContext'
import { displayStatus, getChange, readingUnit, reportForMode } from '../lib/results'
import { reportLabel } from '../lib/history'
import type { Marker, ViewMode } from '../types'

export function PrintReport({ rows, mode }: { rows: Marker[]; mode: ViewMode }) {
  const { guidance, person, reports, isPersonal, historical } = useDataset()
  const report = reportForMode(mode)
  return (
    <section className="print-report" aria-label="Printable comparison">
      <h1>Wellnote / {isPersonal ? 'PERSONAL LOCAL IMPORT' : 'SYNTHETIC DEMO'}</h1>
      <p><strong>{isPersonal ? 'PRIVATE HEALTH DATA. Imported JSON; no attached original reports. Keep this printout private.' : 'NOT A MEDICAL RECORD. All profiles, dates, results and ranges are fictional illustrations.'}</strong></p>
      <p>{person.name} / {reportLabel(reports.earlier)} compared with {reportLabel(reports.latest)}</p>
      <p><strong>{rows.length} markers matching the current filters.</strong> Status follows the {reports[report].fullDate} report. No diagnosis or prescription.</p>
      <table><thead><tr><th>Biomarker</th><th>{reportLabel(reports.earlier)}</th><th>{reportLabel(reports.latest)}</th><th>Change</th><th>Selected status</th><th>{isPersonal ? 'Imported' : 'Illustrative'} reference</th></tr></thead>
        <tbody>{rows.map((marker) => <tr key={marker.id}><td><strong>{marker.name}</strong><br />{groupLabel(marker.group)}</td><td>{marker.earlier ? `${marker.earlier.raw} ${readingUnit(marker, 'earlier')}` : 'Not reported'}</td><td>{marker.latest ? `${marker.latest.raw} ${readingUnit(marker, 'latest')}` : 'Not reported'}</td><td>{getChange(marker, reports).label}</td><td>{displayStatus(marker, report)}</td><td>{marker[report]?.reference.label ?? 'No result'}</td></tr>)}</tbody>
      </table>
      <h2>General educational examples — not personal guidance</h2>
      <p>Guidance follows the selected later report: {reportLabel(reports.latest)}. {historical && 'Historical selection, not the newest report.'}</p>
      {guidance.map((plan) => <article key={plan.id}><h3>{plan.title}</h3><p>{plan.summary}</p><p><strong>Food:</strong> {plan.foods[0]}</p><p><strong>Discussion:</strong> {plan.clinician.join(' ')}</p><p><strong>Safety:</strong> {plan.caution}</p></article>)}
      <p>Source: {isPersonal ? 'locally imported JSON, not independently verified' : 'hand-authored synthetic fixtures'}. References are report-specific. Bounds are not exact values. Context-only measurements are not diagnostic. No medication dose is prescribed.</p>
    </section>
  )
}
