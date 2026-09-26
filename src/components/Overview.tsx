import { ArrowDownRight, ArrowRight, ArrowUpRight, Check, CircleCheck, FlaskConical, Info, Sun } from 'lucide-react'
import { useState } from 'react'
import { useDataset } from '../DatasetContext'
import { exactValue, formatNumber, getChange, needsAttention, readingStatus, reportForMode, summarize } from '../lib/results'
import type { Marker, StatusFilter, TrendFilter, ViewMode } from '../types'
import { StatusBadge } from './ui'

export function SummaryStats({
  mode, onFilter,
}: {
  mode: ViewMode
  onFilter: (status: StatusFilter, trend?: TrendFilter) => void
}) {
  const { markers, reports, isPersonal } = useDataset()
  const report = reportForMode(mode)
  const summary = summarize(markers, report)
  return (
    <section aria-label={`${reports[report].fullDate} report-wide summary`}>
      <div className="summary-caption">
        <span>THE BIG PICTURE</span>
        <span>All results in the {reports[report].shortDate} report <span className="caption-dot" /> Unaffected by filters</span>
      </div>
      <div className="stats-grid">
        <button className="stat-card" onClick={() => onFilter('all')}>
          <div className="stat-top"><span>Markers tracked</span><FlaskConical size={18} /></div>
          <div className="stat-number">{markers.length}<span className="stat-tag">across 2 reports</span></div>
          <div className="stat-foot">{summary.reported} reported in {reports[report].shortDate}<ArrowUpRight size={14} /></div>
        </button>
        <button className="stat-card" onClick={() => onFilter('normal')}>
          <div className="stat-top"><span>In reference range</span><CircleCheck size={18} /></div>
          <div className="stat-number green-text">{summary.normal}<span className="mini-dots" aria-hidden="true"><i /><i /><i /><i /><i /></span></div>
          <div className="stat-foot">Including qualitative results<ArrowUpRight size={14} /></div>
        </button>
        <button className="stat-card attention-stat" onClick={() => onFilter('attention')}>
          <div className="stat-top"><span>Worth a closer look</span><Info size={18} /></div>
          <div className="stat-number">{summary.attention}<span className="stat-tag amber-tag">review in context</span></div>
          <div className="stat-foot">{summary.high} high / {summary.low} low{summary.boundary ? ` / ${summary.boundary} at cutoff` : ''}<ArrowUpRight size={14} /></div>
        </button>
        <button className="stat-card" onClick={() => mode === 'earlier' ? onFilter('context') : onFilter('all', 'returned')}>
          <div className="stat-top"><span>{mode === 'earlier' ? 'For clinical context' : 'Back in range'}</span>{mode === 'earlier' ? <Info size={18} /> : <ArrowDownRight size={18} />}</div>
          <div className="stat-number green-text">{mode === 'earlier' ? summary.context : summary.returned}<span className="stat-trend">{mode !== 'earlier' && <><Check size={12} /> positive change</>}</span></div>
          <div className="stat-foot">{mode === 'earlier' ? 'Not scored as high or low' : `Previously outside the ${isPersonal ? 'imported' : 'example'} range`}<ArrowUpRight size={14} /></div>
        </button>
      </div>
    </section>
  )
}

export function RangeTrack({ marker, mode = 'compare' }: { marker: Marker; mode?: ViewMode }) {
  const report = reportForMode(mode)
  const reading = marker[report]
  const current = exactValue(reading)
  const previous = mode === 'compare' ? exactValue(marker.earlier) : null
  if (current === null || !reading || reading.reference.kind !== 'numeric') {
    return <span className="unplottable">No exact numeric plot</span>
  }
  const { min = 0, max } = reading.reference
  const domainMax = Math.max(max ?? min * 1.5, current, previous ?? 0, 1) * 1.2
  const position = (value: number) => `${Math.max(0, Math.min(100, (value / domainMax) * 100))}%`
  const start = Math.min(previous ?? current, current)
  const distance = Math.abs((previous ?? current) - current)
  return (
    <div className="range-track" aria-hidden="true">
      <span className="reference-band" style={{ left: position(min), width: position((max ?? domainMax) - min) }} />
      {previous !== null && <>
        <span className="reading-connector" style={{ left: position(start), width: position(distance) }} />
        <span className="reading-dot earlier-dot" style={{ left: position(previous) }} />
      </>}
      <span className={`reading-dot current-dot dot-${readingStatus(reading)}`} style={{ left: position(current) }} />
    </div>
  )
}

export function ComparisonChart({ mode, onSelect }: { mode: ViewMode; onSelect: (marker: Marker) => void }) {
  const { findMarker, reports, isPersonal } = useDataset()
  const [chart, setChart] = useState<'lipids' | 'nutrients'>('lipids')
  const ids = chart === 'lipids'
    ? ['total-cholesterol', 'ldl', 'hdl', 'triglycerides']
    : ['vitamin-d', 'vitamin-b12', 'iron', 'magnesium']
  const report = reportForMode(mode)
  return (
    <section className="panel comparison-panel" aria-labelledby="comparison-heading">
      <div className="panel-heading">
        <div>
          <div className="eyebrow">CHANGE, MADE VISIBLE</div>
          <h2 id="comparison-heading">{mode === 'compare' ? 'Small shifts. A clearer picture.' : 'Your results, in perspective.'}</h2>
        </div>
        <div className="chart-tabs" aria-label="Chart category">
          <button className={chart === 'lipids' ? 'active' : ''} aria-pressed={chart === 'lipids'} onClick={() => setChart('lipids')}>Lipids</button>
          <button className={chart === 'nutrients' ? 'active' : ''} aria-pressed={chart === 'nutrients'} onClick={() => setChart('nutrients')}>Nutrients</button>
        </div>
      </div>
      <div className="chart-legend">
        {mode === 'compare' && <span><i className="legend-earlier" />{reports.earlier.shortDate}</span>}
        <span><i className="legend-latest" />{reports[report].shortDate}</span>
        <span><i className="legend-range" />{isPersonal ? 'Imported reference' : 'Illustrative range'}</span>
      </div>
      <div className="comparison-rows">
        {ids.map((id) => {
          const marker = findMarker(id)
          return (
            <button className="comparison-row" key={id} onClick={() => onSelect(marker)} aria-label={`View ${marker.name} details`}>
              <div className="chart-marker-name"><strong>{marker.name}</strong><span>{marker.unit}</span></div>
              <RangeTrack marker={marker} mode={mode} />
              <div className="chart-values">
                {mode === 'compare' && <span>{marker.earlier?.raw ?? '\u2014'} <ArrowRight size={11} /></span>}
                <strong>{marker[report]?.raw ?? '\u2014'}</strong>
              </div>
            </button>
          )
        })}
      </div>
      <div className="chart-footnote"><Info size={13} />Each row has its own scale. {mode === 'compare' ? 'Two readings, not a continuous trend.' : 'Shading shows the reported reference range.'}</div>
    </section>
  )
}

export function PriorityCard({ mode, onGuide, onReports }: { mode: ViewMode; onGuide: () => void; onReports: () => void }) {
  const { findMarker, markers, reports, isPersonal } = useDataset()
  const vitaminD = findMarker('vitamin-d')
  const change = getChange(vitaminD, reports)
  if (mode === 'earlier') {
    return (
      <section className="priority-card historical-card">
        <div className="priority-art" aria-hidden="true"><FlaskConical size={78} strokeWidth={0.7} /></div>
        <div className="eyebrow">{isPersonal ? 'IMPORTED' : 'FICTIONAL'} STARTING POINT / {reports.earlier.shortDate}</div>
        <h2>Every story has<br />a starting point.</h2>
        <p>The earlier {isPersonal ? 'import' : 'example'} has {summarize(markers, 'earlier').attention} results needing review against {isPersonal ? 'imported' : 'illustrative'} ranges. {summarize(markers, 'latest').returned} results returned to range in the latest report.</p>
        <div className="priority-note">Historical flags are not current treatment recommendations.</div>
        <button className="button light-button" onClick={onReports}>Explore the source reports <ArrowUpRight size={16} /></button>
      </section>
    )
  }
  return (
    <section className="priority-card">
      <div className="priority-art" aria-hidden="true"><Sun size={116} strokeWidth={0.7} /></div>
      <div className="eyebrow"><span className="little-spark" />LATEST REPORT / YOUR NEXT FOCUS</div>
      <h2>{needsAttention(readingStatus(vitaminD.latest)) ? 'Vitamin D, in context.' : 'A snapshot, not a diagnosis.'}</h2>
      <div className="priority-value">{vitaminD.latest?.raw ?? '—'}<span>{vitaminD.unit}</span><StatusBadge marker={vitaminD} /></div>
      <div className="priority-change">{change.percent !== null ? `${formatNumber(change.percent, 1)}% from ${vitaminD.earlier?.raw} ${vitaminD.unit}` : change.label}</div>
      <p>{isPersonal ? 'Status follows your imported reference. A flag alone does not establish a treatment need.' : 'This fictional scenario illustrates reference-based flags.'} Do not self-dose from app results.</p>
      <button className="button light-button" onClick={needsAttention(readingStatus(vitaminD.latest)) ? onGuide : onReports}>{needsAttention(readingStatus(vitaminD.latest)) ? 'Food, habits & next steps' : 'Review source context'} <ArrowUpRight size={16} /></button>
    </section>
  )
}
