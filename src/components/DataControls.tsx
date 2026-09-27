import { useRef, useState } from 'react'
import { useDataset } from '../DatasetContext'
import { demoDataset, MAX_DATASET_BYTES, parseDataset } from '../lib/dataset'

export function DataControls() {
  const { isPersonal, saved, loadDataset, clearData } = useDataset()
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const generation = useRef(0)

  const template = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(demoDataset, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'wellnote-synthetic-import-template.json'
    document.body.append(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return <section className="panel data-controls" aria-label="Local health data">
    <div><h3>Local health data</h3><p>Choose a portable Wellnote JSON file. It is read on this device, never uploaded. PDFs are not supported.</p></div>
    <label className="remember-choice"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} disabled={busy} />Remember the next import on this browser (unencrypted; shared devices are unsafe)</label>
    <div className="data-actions">
      <label className="button primary-button import-label">Load my health data<input aria-label="Load my health data" type="file" accept=".json,application/json" disabled={busy} onChange={async (event) => {
        const file = event.currentTarget.files?.[0]
        event.currentTarget.value = ''
        if (!file) return
        const request = ++generation.current
        const consent = remember
        setBusy(true)
        setError('')
        try {
          if (!file.name.toLowerCase().endsWith('.json')) throw new Error('Choose a .json Wellnote export. PDF reports cannot be imported.')
          if (file.size > MAX_DATASET_BYTES) throw new Error('This file exceeds 2 MiB. Export a smaller Wellnote JSON dataset.')
          const dataset = parseDataset(await file.text())
          if (request === generation.current) loadDataset(dataset, consent)
        } catch (error) {
          if (request === generation.current) setError(error instanceof Error ? error.message : 'The file could not be read. Try a valid Wellnote version 1 or 2 JSON export.')
        } finally {
          if (request === generation.current) setBusy(false)
        }
      }} /></label>
      <button className="button secondary-button" onClick={template}>Download JSON template</button>
      <button className="button secondary-button" onClick={() => {
        generation.current++
        setBusy(false)
        setError('')
        setRemember(false)
        clearData()
      }}>Clear personal data / return to demo</button>
    </div>
    <p role="status">{busy ? 'Reading and validating locally…' : isPersonal
      ? saved ? 'Personal data is saved only in this browser. Clear it when finished.' : 'Personal data is in memory only. Reloading or closing this page restores the demo.'
      : 'Synthetic demo active. Remember is off by default; no personal data is bundled with this website.'}</p>
    {error && <p className="import-error" role="alert">{error}</p>}
    <p className="data-safety">Local browser storage is not encrypted and other code on the same website origin may access it. Use a trusted browser and avoid shared devices. Clearing removes this app&apos;s saved copy, not your original file or downloads.</p>
  </section>
}
