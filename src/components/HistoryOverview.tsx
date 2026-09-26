import { useMemo, useState } from 'react'
import { useDataset } from '../DatasetContext'
import { groups } from '../data/reports'
import type { GroupId, HistoryMarker } from '../types'
import { HistoryChart } from './HistoryChart'
import { buildHistorySeries } from '../lib/history-charts'

export function HistoryOverview({ onOpen }: { onOpen: (marker: HistoryMarker) => void }) {
  const { dataset, allReports, isPersonal } = useDataset()
  const [group, setGroup] = useState<GroupId | 'all'>('all')
  const [markerId, setMarkerId] = useState('')
  const available = useMemo(() => dataset.markers.filter((marker) => group === 'all' || marker.group === group)
    .sort((a, b) => a.name.localeCompare(b.name)), [dataset.markers, group])
  const preferred = useMemo(() => available.map((item) => ({
    marker: item, points: buildHistorySeries(item, allReports).exactCount,
  })).sort((a, b) => b.points - a.points)[0]?.marker, [available, allReports])
  const marker = available.find((item) => item.id === markerId) ?? preferred
  return <section className="panel history-overview-panel" aria-labelledby="history-overview-heading">
    <div className="section-heading"><div><div className="eyebrow">ONE BIOMARKER. ALL YOUR SAMPLES.</div><h2 id="history-overview-heading">Your history, over time.</h2></div><span>{allReports.length} reports</span></div>
    <div className="history-overview-controls">
      <label>Trend category<select aria-label="Trend category" value={group} onChange={(event) => setGroup(event.target.value as GroupId | 'all')}>
        <option value="all">All categories</option>{groups.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
      </select></label>
      <label>Trend biomarker<select aria-label="Trend biomarker" value={marker?.id ?? ''} onChange={(event) => setMarkerId(event.target.value)}>
        {available.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select></label>
    </div>
    <p className="history-scope-note">This chart covers all reports, independent of the selected comparison pair. Each biomarker has its own axis; unrelated units are never overlaid.</p>
    {marker ? <HistoryChart marker={marker} reports={allReports} personal={isPersonal} onOpen={() => onOpen(marker)} /> : <p>No biomarkers in this category.</p>}
  </section>
}
