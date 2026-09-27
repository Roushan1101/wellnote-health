import { useDataset } from '../DatasetContext'
import { reportLabel } from '../lib/history'

export function ReportPicker({ onPair }: {
  onPair: (first: string, second: string) => void
}) {
  const { allReports, pair, historical, unavailable, dataset } = useDataset()
  return <section className="panel report-picker compact-pair-picker" aria-label="Choose report comparison">
    <div className="pair-selectors">
      <label>Before report<select aria-label="Before report" value={pair[0]} onChange={(event) => onPair(event.target.value, pair[1])}>
        {allReports.map((report) => <option key={report.id} value={report.id} disabled={report.id === pair[1]}>{reportLabel(report)}</option>)}
      </select></label>
      <label>After report<select aria-label="After report" value={pair[1]} onChange={(event) => onPair(pair[0], event.target.value)}>
        {allReports.map((report) => <option key={report.id} value={report.id} disabled={report.id === pair[0]}>{reportLabel(report)}</option>)}
      </select></label>
    </div>
    <p role="status">{historical ? 'Historical comparison: the selected later report is not the newest report.' : 'The selected later report is the newest report.'} {unavailable > 0 && `${unavailable} of ${dataset.markers.length} measurements are unavailable in both selected reports and excluded from these rows.`}</p>
  </section>
}
