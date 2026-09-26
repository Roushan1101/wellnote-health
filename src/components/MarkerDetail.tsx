import { ArrowRight, BookOpen, Info, Leaf, MessageCircle, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { groupLabel } from '../data/reports'
import { useDataset } from '../DatasetContext'
import { getChange, getTrend, rangeChanged, trendLabels } from '../lib/results'
import type { Marker } from '../types'
import { RangeTrack } from './Overview'
import { GroupIcon, MedicalNote, StatusBadge } from './ui'

export function MarkerDetail({ marker, onClose, onGuide }: {
  marker: Marker
  onClose: () => void
  onGuide: (id: string) => void
}) {
  const { reports, guidance, isPersonal } = useDataset()
  const dialogRef = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])
  const plan = guidance.find((item) => item.markerIds.includes(marker.id))
  const change = getChange(marker, reports)
  return (
    <dialog
      className="marker-dialog"
      ref={dialogRef}
      aria-labelledby="marker-detail-title"
      onCancel={(event) => { event.preventDefault(); onClose() }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const rect = event.currentTarget.getBoundingClientRect()
          if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose()
        }
      }}
    >
      <div className="dialog-heading">
        <span className={`dialog-group-icon group-${marker.group}`}><GroupIcon group={marker.group} size={24} /></span>
        <div><div className="eyebrow">{groupLabel(marker.group)}</div><h2 id="marker-detail-title">{marker.name}</h2></div>
        <button className="icon-button close-dialog" onClick={onClose} aria-label="Close biomarker details" autoFocus><X size={20} /></button>
      </div>
      <div className="dialog-content">
        <p className="dialog-demo-note"><strong>{isPersonal ? 'LOCAL PERSONAL IMPORT.' : 'SYNTHETIC DEMO · NOT A MEDICAL RECORD.'}</strong> {isPersonal ? 'Read locally from your JSON. References are not independently verified; no original PDF is attached.' : 'This profile and all measurements are fictional.'}</p>
        <div className="detail-readings">
          {(['earlier', 'latest'] as const).map((key) => {
            const reading = marker[key]
            return (
              <div className={`detail-reading ${key}`} key={key}>
                <div className="eyebrow">{key === 'earlier' ? 'BEFORE' : 'NOW'} / {reports[key].label}</div>
                <div className="detail-value">{reading?.raw ?? '\u2014'}<span>{reading ? marker.unit : 'Not reported'}</span></div>
                <StatusBadge marker={marker} report={key} />
                <dl><dt>{isPersonal ? 'Imported' : 'Illustrative'} reference</dt><dd>{reading?.reference.label ?? 'No result in this report'}</dd></dl>
                {reading && <span className="source-link"><BookOpen size={13} />{isPersonal ? `Imported JSON: ${reading.sourceLabel}${reading.page ? ` / source page ${reading.page} (not attached)` : ''}` : `Synthetic fixture: ${marker.id}`} / {reports[key].date}</span>}
              </div>
            )
          })}
        </div>
        <div className="detail-change">
          <div><span>REPORTED CHANGE</span><strong>{change.label}{change.amount !== null && change.amount !== 0 && marker.unit ? ` ${marker.unit}` : ''}</strong></div>
          <p>{change.detail}<span>{trendLabels[getTrend(marker)]}</span></p>
        </div>
        {marker.earlier && marker.latest && marker.latest.reference.kind === 'numeric' && <div className="detail-range"><RangeTrack marker={marker} /><div className="chart-legend"><span><i className="legend-earlier" />Earlier</span><span><i className="legend-latest" />Latest</span><span><i className="legend-range" />Latest {isPersonal ? 'imported' : 'illustrative'} reference</span></div></div>}
        <section className="detail-meaning">
          <h3>What to keep in mind</h3>
          <p>{marker.note ?? 'A numerical rise or fall is not automatically better or worse. Interpret results in clinical context; this app does not diagnose health concerns.'}</p>
          {rangeChanged(marker) && <div className="range-change-callout"><Info size={16} /><span>The reference changed between reports. Each result is evaluated against its own report, not a shared cutoff.</span></div>}
        </section>
        {plan ? <section className="detail-guidance">
          <div><Leaf size={18} /><h3>Food & everyday habits</h3></div>
          <p>{plan.foods[0]}</p>
          <div><MessageCircle size={18} /><h3>A question for your clinician</h3></div>
          <p>{plan.clinician[0]}</p>
          <button className="text-button" onClick={() => { onClose(); onGuide(plan.id) }}>Read the complete guidance <ArrowRight size={15} /></button>
        </section> : <div className="no-treatment-note"><Info size={17} /><p>No corrective medicine is suggested from this result alone. Continue suitable healthy habits and discuss symptoms or concerns with a clinician.</p></div>}
        <MedicalNote compact />
      </div>
    </dialog>
  )
}
