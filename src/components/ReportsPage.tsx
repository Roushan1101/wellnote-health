import { BookOpen, CalendarDays, Download, FileText, Fingerprint, Info, ShieldCheck } from 'lucide-react'
import { useDataset } from '../DatasetContext'
import { createSyntheticReport } from '../lib/synthetic-report'
import { rangeChanged, summarize } from '../lib/results'
import { collectionLabel } from '../lib/history'

export function ReportsPage() {
  const { dataset, markers, person, allReports, isPersonal } = useDataset()
  const summary = summarize(markers, 'latest')
  const downloadReport = (key: string) => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(createSyntheticReport(key, dataset, isPersonal), null, 2)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `wellnote-${isPersonal ? 'personal' : 'synthetic'}-report-${allReports.findIndex((report) => report.id === key) + 1}.json`
    document.body.append(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return (
    <div className="reports-page">
      <section className="report-cards" aria-label={`${isPersonal ? 'Imported' : 'Synthetic'} report summaries`}>
        {allReports.map((report, index) => (
          <article className={`panel source-report-card source-${index === 0 ? 'earlier' : index === allReports.length - 1 ? 'latest' : 'intermediate'}`} key={report.id}>
            <div className="report-card-top"><span className="report-document-icon"><FileText size={26} /></span><span className="report-label">{isPersonal ? 'LOCAL IMPORT' : 'SYNTHETIC'} / SAMPLE {index + 1}</span></div>
            <h2>{report.fullDate}</h2>
            <p>{isPersonal ? 'Imported dataset — no original PDF attached' : 'Fictional report summary — not a medical record'}</p>
            <dl className="report-metadata">
              <div><dt><Fingerprint size={14} />{isPersonal ? 'Imported' : 'Fictional'} profile</dt><dd>{person.name}</dd></div>
              <div><dt><CalendarDays size={14} />Sample date</dt><dd>{collectionLabel(report)}</dd></div>
              <div><dt>Report ID</dt><dd>{report.id}</dd></div>
              {report.reportedDate && <div><dt>Reported date (not collection)</dt><dd>{report.reportedDate}</dd></div>}
              {report.laboratory && <div><dt>Laboratory metadata</dt><dd>{report.laboratory}</dd></div>}
              {isPersonal && report.age !== undefined && <div><dt>Age as supplied (not verified)</dt><dd>{report.age}{person.reportedSex ? ` / ${person.reportedSex}` : ''}</dd></div>}
              <div><dt><BookOpen size={14} />Source</dt><dd>{isPersonal ? 'Your locally read JSON file' : 'Hand-authored synthetic fixtures'}</dd></div>
              <div><dt><FileText size={14} />Measurements</dt><dd>{dataset.markers.filter((marker) => marker.readings[report.id]).length} {isPersonal ? 'imported' : 'example'} results</dd></div>
            </dl>
            {report.note && <p className="report-context-note"><strong>Supplied report context — not independently verified:</strong> {report.note}</p>}
            <div className="report-card-actions"><button className="button primary-button" onClick={() => downloadReport(report.id)} aria-label={`Download ${isPersonal ? 'personal' : 'synthetic'} ${report.fullDate} JSON (${report.id})`}><Download size={16} />Download {isPersonal ? 'personal' : 'synthetic'} JSON</button></div>
            <details className="filename-details"><summary>View {isPersonal ? 'imported' : 'synthetic'} summary</summary><p>{isPersonal ? 'References were supplied in your JSON and are not independently verified. Page references do not attach or link any document.' : 'Every value and reference below is an invented illustration.'}</p><ul>{dataset.markers.filter((marker) => marker.readings[report.id]).map((marker) => {
              const reading = marker.readings[report.id]!
              return <li key={marker.id}><strong>{marker.name}:</strong> {reading.raw} {reading.unit ?? marker.unit} — reference: {reading.reference.label}{reading.page ? ` / source page ${reading.page} (not attached)` : ''}{reading.note ? ` / ${reading.note}` : ''}</li>
            })}</ul></details>
          </article>
        ))}
      </section>
      <section className="panel methodology-panel">
        <div className="panel-heading"><div><div className="eyebrow">TRANSPARENCY, BY DESIGN</div><h2>What this comparison includes</h2></div><Info size={20} /></div>
        <div className="coverage-grid">
          <div><strong>{dataset.markers.length}</strong><span>{isPersonal ? 'imported' : 'synthetic'} measurements across {allReports.length} reports</span></div>
          <div><strong>{summary.shared}</strong><span>shared across selected pair</span></div>
          <div><strong>{markers.filter((marker) => !marker.earlier && marker.latest).length}</strong><span>selected later only</span></div>
          <div><strong>{markers.filter((marker) => marker.earlier && !marker.latest).length}</strong><span>selected earlier only</span></div>
        </div>
        <div className="methodology-list">
          <div><span>01</span><p><strong>{isPersonal ? 'Local file, not an upload.' : 'No real records bundled.'}</strong> {isPersonal ? 'This dashboard uses your imported JSON. It cannot verify the original report, extraction accuracy or clinical suitability of its references. Keep personal exports private.' : 'The bundled profile, dates and measurements were invented for the demo, not anonymized from a patient.'} No original documents are included.</p></div>
          <div><span>02</span><p><strong>Report-specific references.</strong> {markers.filter(rangeChanged).length} measurements have changed references in the selected pair. Each reading is evaluated against its own {isPersonal ? 'imported' : 'illustrative'} reference. Different effective units disable numerical comparisons and shared charts; no conversion is inferred.</p></div>
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
