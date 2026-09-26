import { useId, useMemo } from 'react'
import type { HistoryMarker, HistoryReport } from '../types'
import { buildChartAxis, buildHistorySeries } from '../lib/history-charts'
import { collectionLabel, reportLabel } from '../lib/history'
import '../charts.css'

export function HistoryChart({ marker, reports, personal, onOpen }: {
  marker: HistoryMarker
  reports: HistoryReport[]
  personal: boolean
  onOpen?: () => void
}) {
  const id = useId()
  const series = useMemo(() => buildHistorySeries(marker, reports), [marker, reports])
  const axis = useMemo(() => buildChartAxis(series.min, series.max), [series.min, series.max])
  const width = Math.max(620, Math.min(3200, reports.length * 65))
  const height = 260
  const left = axis.leftGutter
  const right = width - 24
  const top = 20
  const bottom = height - 44
  const x = (fraction: number) => left + fraction * (right - left)
  const y = (value: number) => bottom - (value - axis.min) / (axis.max - axis.min) * (bottom - top)
  const referenceLabel = personal ? 'Report reference' : 'Illustrative reference'
  let previousLabelX = -Infinity

  return <figure className="history-chart" data-history-chart={marker.id} aria-labelledby={`${id}-title`}>
    <figcaption id={`${id}-title`}><strong>{marker.name} — all-report history</strong><span>{series.unit || 'Unit not supplied'} · {reports.length} samples</span></figcaption>
    {series.blocked ? <p className="history-chart-unavailable" role="status">{series.blocked}</p> : <>
      <div className="history-chart-scroll" role="region" aria-label={`${marker.name} history chart; scroll horizontally if needed`} tabIndex={0}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ minWidth: width }} data-history-left-gutter={left} aria-labelledby={`${id}-title ${id}-description`} role="group" aria-roledescription="line chart">
          <desc id={`${id}-description`}>Exact numeric measurements only, spaced by elapsed sample dates. Reference boundaries belong to each individual source report. Missing or qualified results break the line.</desc>
          {axis.ticks.map(({ value, label }, index) => <g key={index}><line x1={left} x2={right} y1={y(value)} y2={y(value)} className="history-grid-line" /><text x={left - 12} y={y(value) + 4} textAnchor="end" className="history-axis-label" data-history-y-tick={index} data-axis-value={value}>{label}</text></g>)}
          {series.samples.map((sample) => {
            const reference = sample.reading?.reference
            if (reference?.kind !== 'numeric') return null
            return <g key={sample.report.id} data-reference-report={sample.report.id} data-reference-label={reference.label} className="history-reference">
              <title>{reportLabel(sample.report)} / {referenceLabel}: {reference.label}</title>
              {reference.min !== undefined && reference.max !== undefined && <rect x={x(sample.x) - 7} y={y(reference.max)} width={14} height={Math.max(1, y(reference.min) - y(reference.max))} className="history-reference-band" />}
              {reference.min !== undefined && <line x1={x(sample.x) - 10} x2={x(sample.x) + 10} y1={y(reference.min)} y2={y(reference.min)} data-reference-bound="min" data-reference-value={reference.min} className="history-reference-limit" strokeDasharray={reference.minExclusive ? '3 2' : undefined} />}
              {reference.max !== undefined && <line x1={x(sample.x) - 10} x2={x(sample.x) + 10} y1={y(reference.max)} y2={y(reference.max)} data-reference-bound="max" data-reference-value={reference.max} className="history-reference-limit" strokeDasharray={reference.maxExclusive ? '3 2' : undefined} />}
            </g>
          })}
          {series.segments.map(({ from, to }) => <line key={`${from.report.id}-${to.report.id}`} data-history-segment={`${from.report.id}:${to.report.id}`} x1={x(from.x)} y1={y(from.value!)} x2={x(to.x)} y2={y(to.value!)} className="history-value-line" />)}
          {series.samples.map((sample) => sample.value === null ? null : <g key={sample.report.id}
            data-history-point={sample.report.id} data-date-position={sample.x}
            data-raw-value={sample.reading!.raw} data-numeric-value={sample.value} data-effective-unit={sample.unit}
            data-sample-date={sample.report.collectionDate ?? sample.report.date}
            role={onOpen ? 'button' : undefined} tabIndex={onOpen ? 0 : undefined}
            aria-label={`${marker.name}: ${sample.reading!.raw} ${sample.unit}; ${reportLabel(sample.report)}${onOpen ? '. Open full history' : ''}`}
            onClick={onOpen} onKeyDown={onOpen ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpen() }
            } : undefined}>
            <title>{sample.reading!.raw} {sample.unit} / {reportLabel(sample.report)}</title>
            {onOpen && <circle cx={x(sample.x)} cy={y(sample.value)} r={22} className="history-hit-target" aria-hidden="true" />}
            <circle cx={x(sample.x)} cy={y(sample.value)} r={onOpen ? 7 : 5} className="history-value-point" />
          </g>)}
          {series.samples.map((sample, index) => {
            const position = x(sample.x)
            const isLast = index === series.samples.length - 1
            if (position - previousLabelX < 110 && !isLast) return null
            if (isLast && position - previousLabelX < 70) return null
            previousLabelX = position
            return <text key={sample.report.id} x={position} y={bottom + 24} textAnchor={index === 0 ? 'start' : isLast ? 'end' : 'middle'} className="history-axis-label">{sample.report.shortDate}</text>
          })}
        </svg>
      </div>
      <div className="history-chart-key"><span><i className="history-key-line" />Exact measurement</span><span><i className="history-key-reference" />{referenceLabel} for each sample</span></div>
      {axis.offset !== 0 && <p className="history-chart-note">Y-axis labels are offsets from {String(axis.offset)} {series.unit}; add that baseline to each tick. Source reading precision is unchanged.</p>}
    </>}
    <p className="history-chart-note">X positions use elapsed sample dates, not equal spacing. Lines connect adjacent exact samples only; missing, bounded and qualitative results are never zero. Shaded mini-bands and boundary caps apply only to their own sample; dashed caps mark strict limits.</p>
    {series.duplicateDays && <p className="history-chart-note">Same-day samples share the same x position, ordered by stable report ID. No line joins same-day samples; overlapping points remain separately listed in the reading table.</p>}
    {reports.some((report) => !report.collectionDate) && <p className="history-chart-note">Some collection dates were not supplied. Those positions use explicitly labeled legacy report dates.</p>}
    {onOpen && <button className="button secondary-button" onClick={onOpen}>Open {marker.name} full history</button>}
    <div className="history-sample-dates" aria-label={`${marker.name} sample dates`}>
      {series.samples.map((sample) => <span key={sample.report.id}>{collectionLabel(sample.report)} · {sample.report.id}: {sample.reading?.raw ?? 'Not reported'}{sample.reading ? ` ${sample.unit}` : ''}</span>)}
    </div>
  </figure>
}
