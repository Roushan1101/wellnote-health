import { BookOpen, CalendarDays, Download, FileText, Fingerprint, Info, ShieldCheck } from 'lucide-react'
import { useDataset } from '../DatasetContext'
import { createSyntheticReport } from '../lib/synthetic-report'
import { rangeChanged, summarize } from '../lib/results'
import type { ReportKey } from '../types'

export function ReportsPage() {
  const { dataset, markers, person, reports, isPersonal } = useDataset()
  const summary = summarize(markers, 'latest')
  const downloadReport = (key: ReportKey) => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(createSyntheticReport(key, dataset, isPersonal), null, 2)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `wellnote-${isPersonal ? 'personal' : 'synthetic'}-report-${reports[key].date}.json`
    document.body.append(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return (
    <div className="reports-page">
      <section className="report-cards" aria-label={`${isPersonal ? 'Imported' : 'Synthetic'} report summaries`}>
        {(['earlier', 'latest'] as const).map((key) => (
          <article className={`panel source-report-card source-${key}`} key={key}>
            <div className="report-card-top"><span className="report-document-icon"><FileText size={26} /></span><span className={`report-label ${key}`}>{isPersonal ? 'LOCAL IMPORT' : 'SYNTHETIC'} / {key === 'earlier' ? 'BASELINE' : 'LATEST'}</span></div>
            <h2>{reports[key].fullDate}</h2>
            <p>{isPersonal ? 'Imported dataset — no original PDF attached' : 'Fictional report summary — not a medical record'}</p>
            <dl className="report-metadata">
              <div><dt><Fingerprint size={14} />{isPersonal ? 'Imported' : 'Fictional'} profile</dt><dd>{person.name}</dd></div>
              <div><dt><CalendarDays size={14} />Date</dt><dd>{isPersonal ? reports[key].date : 'Invented for demonstration'}</dd></div>
              {isPersonal && reports[key].age !== undefined && <div><dt>Age on report</dt><dd>{reports[key].age}{person.reportedSex ? ` / ${person.reportedSex}` : ''}</dd></div>}
              <div><dt><BookOpen size={14} />Source</dt><dd>{isPersonal ? 'Your locally read JSON file' : 'Hand-authored synthetic fixtures'}</dd></div>
              <div><dt><FileText size={14} />Measurements</dt><dd>{summarize(markers, key).reported} {isPersonal ? 'imported' : 'example'} results</dd></div>
            </dl>
            <div className="report-card-actions"><button className="button primary-button" onClick={() => downloadReport(key)} aria-label={`Download ${isPersonal ? 'personal' : 'synthetic'} ${reports[key].fullDate} JSON`}><Download size={16} />Download {isPersonal ? 'personal' : 'synthetic'} JSON</button></div>
            <details className="filename-details"><summary>View {isPersonal ? 'imported' : 'synthetic'} summary</summary><p>{isPersonal ? 'References were supplied in your JSON and are not independently verified. Page references do not attach or link any document.' : 'Every value and reference below is an invented illustration.'}</p><ul>{markers.filter((marker) => marker[key]).map((marker) => <li key={marker.id}><strong>{marker.name}:</strong> {marker[key]?.raw} {marker.unit} — reference: {marker[key]?.reference.label}{isPersonal && marker[key]?.page ? ` / source page ${marker[key]?.page} (not attached)` : ''}</li>)}</ul></details>
          </article>
        ))}
      </section>
      <section className="panel methodology-panel">
        <div className="panel-heading"><div><div className="eyebrow">TRANSPARENCY, BY DESIGN</div><h2>What this comparison includes</h2></div><Info size={20} /></div>
        <div className="coverage-grid">
          <div><strong>{markers.length}</strong><span>{isPersonal ? 'imported' : 'synthetic'} measurements</span></div>
          <div><strong>{summary.shared}</strong><span>shared across both reports</span></div>
          <div><strong>{markers.filter((marker) => !marker.earlier && marker.latest).length}</strong><span>latest only</span></div>
          <div><strong>{markers.filter((marker) => marker.earlier && !marker.latest).length}</strong><span>earlier only</span></div>
        </div>
        <div className="methodology-list">
          <div><span>01</span><p><strong>{isPersonal ? 'Local file, not an upload.' : 'No real records bundled.'}</strong> {isPersonal ? 'This dashboard uses your imported JSON. It cannot verify the original report, extraction accuracy or clinical suitability of its references. Keep personal exports private.' : 'The bundled profile, dates and measurements were invented for the demo, not anonymized from a patient.'} No original documents are included.</p></div>
          <div><span>02</span><p><strong>Report-specific references.</strong> {markers.filter(rangeChanged).length} measurements have changed reference labels. Each reading is evaluated against its own {isPersonal ? 'imported' : 'illustrative'} reference. This does not establish an individual clinical target.</p></div>
          <div><span>03</span><p><strong>Bounds remain bounds.</strong> Less-than and greater-than results are not treated as exact values; no exact percentage is invented. Strict cutoffs are shown separately.</p></div>
          <div><span>04</span><p><strong>Missing is not zero.</strong> An absent reading stays absent. Context-only measurements are not scored as abnormal.</p></div>
          <div><span>05</span><p><strong>Counts are not a health score.</strong> {summary.returned} results return to their respective reference ranges. A count cannot assess overall health or prescribe treatment.</p></div>
        </div>
      </section>
      <section className="privacy-panel" id="privacy">
        <span className="privacy-icon"><ShieldCheck size={26} /></span>
        <div><div className="eyebrow">PUBLIC FRONTEND. LOCAL-ONLY PERSONAL DATA.</div><h2>Your file is not uploaded.</h2><p>Only synthetic defaults are published. A chosen JSON file is read with the browser file API and kept in memory unless you explicitly choose browser storage. No upload endpoint, accounts, analytics, remote AI or external fonts are used. Production connection requests are blocked by Content Security Policy. Optional educational links open external sites.</p><p><strong>A public website is not private storage.</strong> Hosting providers may log page requests. Remembered data is unencrypted and accessible to other code on the same website origin. Use a trusted browser, avoid shared devices, and clear personal data when finished. Never commit personal JSON files or PDFs to the repository.</p><span className="local-verified"><ShieldCheck size={14} />Source documents are never attached</span></div>
      </section>
    </div>
  )
}
