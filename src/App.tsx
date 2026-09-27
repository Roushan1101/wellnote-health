import {
  Activity, ArrowRight, ArrowUpRight, CalendarDays, Check, ChevronRight, Download,
  FileText, Heart, LayoutDashboard, ListFilter, LockKeyhole, Printer, Settings as SettingsIcon, ShieldCheck, Sparkles, X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { CareGuide, GuidancePreview } from './components/CareGuide'
import { MarkerDetail } from './components/MarkerDetail'
import { ComparisonChart, PriorityCard, SummaryStats } from './components/Overview'
import { PrintReport } from './components/PrintReport'
import { ReportsPage } from './components/ReportsPage'
import { ResultsExplorer } from './components/ResultsExplorer'
import { MedicalNote } from './components/ui'
import { Settings } from './components/Settings'
import { ReportPicker } from './components/ReportPicker'
import { HistoryOverview } from './components/HistoryOverview'
import { AllReportsComparison } from './components/AllReportsComparison'
import { useDataset } from './DatasetContext'
import { collectionLabel, reportLabel } from './lib/history'
import './compact-ui.css'
import { createCsv, defaultFilters, filterMarkers } from './lib/results'
import type { Filters, HistoryMarker, Marker, PageId, StatusFilter, TrendFilter, ViewMode } from './types'

const navigation = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'biomarkers', label: 'Biomarkers', icon: ListFilter },
  { id: 'comparison', label: 'Comparison', icon: CalendarDays },
  { id: 'guide', label: 'Your next steps', icon: Heart },
  { id: 'reports', label: 'Source reports', icon: FileText },
] satisfies { id: PageId; label: string; icon: typeof Heart }[]

function pageFromHash(): PageId {
  const hash = window.location.hash.replace('#', '')
  return navigation.find((item) => item.id === hash)?.id ?? 'overview'
}

const pageContent: Record<PageId, { eyebrow: string; title: string; description: string }> = {
  overview: { eyebrow: 'YOUR WELLNOTE HEALTH JOURNAL', title: 'Your health, in perspective.', description: 'Explore your history across collection dates. Compare any two samples in Biomarkers.' },
  biomarkers: { eyebrow: 'LESS JARGON. MORE UNDERSTANDING.', title: 'Meet your biomarkers.', description: 'Compare every measurement, find a pattern, and go a little deeper.' },
  comparison: { eyebrow: 'EVERY SAMPLE. EVERY SOURCE REFERENCE.', title: 'Compare the whole history.', description: 'All reports side by side, ordered by sample collection date. Each result keeps its own unit and reference.' },
  guide: { eyebrow: 'INFORMED CONVERSATIONS. SMALL, MEANINGFUL STEPS.', title: 'A thoughtful way forward.', description: 'Food, everyday habits and the right questions for your clinician.' },
  reports: { eyebrow: 'SYNTHETIC DATA. TRANSPARENT PROVENANCE.', title: 'The story starts here.', description: 'All fictional report summaries. No original lab documents are attached.' },
}

export default function App() {
  const { revision } = useDataset()
  return <Dashboard key={revision} />
}

function Dashboard() {
  const { markers, guidance, person, reports, isPersonal, allReports, pair, selectPair, storageWarning } = useDataset()
  const daysBetweenReports = Math.round((Date.parse(reports.latest.date) - Date.parse(reports.earlier.date)) / 86_400_000)
  const [page, setPage] = useState<PageId>(pageFromHash)
  const [mode, setMode] = useState<ViewMode>('compare')
  const [filters, setFilters] = useState<Filters>({ ...defaultFilters, groups: [] })
  const [selected, setSelected] = useState<Marker | null>(null)
  const [guideTopic, setGuideTopic] = useState('all')
  const [toast, setToast] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const filtered = useMemo(() => filterMarkers(markers, filters, mode), [markers, filters, mode])
  const content = isPersonal && (page === 'overview' || page === 'reports')
    ? { ...pageContent[page], eyebrow: 'YOUR LOCALLY IMPORTED HEALTH JOURNAL', description: 'Your imported measurements, processed on this device. No original PDFs are attached.' }
    : pageContent[page]

  useEffect(() => {
    const changePage = () => setPage(pageFromHash())
    window.addEventListener('hashchange', changePage)
    return () => window.removeEventListener('hashchange', changePage)
  }, [])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
    document.title = `Wellnote | ${navigation.find((item) => item.id === page)?.label ?? 'Health journal'}`
  }, [page, isPersonal])

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(''), 6500)
    return () => window.clearTimeout(timeout)
  }, [toast])

  const navigate = (next: PageId) => {
    setSelected(null)
    setPage(next)
    window.location.hash = next
  }

  const showGuide = (topic = 'all') => {
    setGuideTopic(topic)
    navigate('guide')
  }

  const openHistoryMarker = ({ readings, ...marker }: HistoryMarker) => {
    setSelected({
      ...marker,
      earlier: readings[reports.earlier.id!] ?? null,
      latest: readings[reports.latest.id!] ?? null,
    })
  }

  const changeMode = (next: ViewMode) => {
    setMode(next)
    if (next !== 'compare') setFilters((current) => ({
      ...current, trend: 'all', sort: current.sort === 'change' ? 'priority' : current.sort,
    }))
  }

  const changePair = (first: string, second: string) => {
    selectPair(first, second)
    setSelected(null)
    setFilters({ ...defaultFilters, groups: [] })
    setGuideTopic('all')
    setMode('compare')
  }

  const snapshot = (id: string) => {
    const partner = pair.includes(id) ? pair.find((key) => key !== id)! : allReports.find((report) => report.id !== id)!.id
    changePair(id, partner)
    setMode(allReports.findIndex((report) => report.id === id) < allReports.findIndex((report) => report.id === partner) ? 'earlier' : 'latest')
    navigate('biomarkers')
  }

  const focusFilter = (status: StatusFilter, trend: TrendFilter = 'all') => {
    if (trend !== 'all') setMode('compare')
    setFilters({ ...defaultFilters, groups: [], status, trend })
    document.getElementById('results')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const exportCsv = () => {
    const csv = createCsv(filtered, reports, isPersonal)
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `wellnote-${isPersonal ? 'personal' : 'synthetic'}-comparison-${reports.earlier.date}-to-${reports.latest.date}.csv`
    document.body.append(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    setToast(`Exported ${filtered.length} matching biomarkers. ${isPersonal ? 'This download contains your personal data; keep it private.' : 'All CSV data is synthetic, not a medical record.'}`)
  }

  return (
    <>
      <a href="#main-content" className="skip-link" onClick={(event) => {
        event.preventDefault()
        document.getElementById('main-content')?.focus()
      }}>Skip to content</a>
      <div className="app-shell">
        <aside className="sidebar">
          <button className="brand" onClick={() => navigate('overview')} aria-label="Wellnote home"><span className="brand-mark"><Activity size={24} strokeWidth={1.8} /></span><span>wellnote<span className="brand-period">.</span></span></button>
          <div className="sidebar-section-label">YOUR HEALTH SPACE</div>
          <nav className="main-navigation" aria-label="Main navigation">
            {navigation.map((item) => <button key={item.id} className={`nav-item ${page === item.id ? 'active' : ''}`} aria-current={page === item.id ? 'page' : undefined} onClick={() => item.id === 'guide' ? showGuide() : navigate(item.id)}><item.icon size={19} strokeWidth={1.7} /><span>{item.label}</span>{item.id === 'guide' && <span className="nav-count">{guidance.length}</span>}{item.id === 'reports' && <span className="nav-count neutral-count">{allReports.length}</span>}</button>)}
          </nav>
          <div className="sidebar-timeline">
            <div className="sidebar-section-label">YOUR REPORT TIMELINE</div>
            {allReports.map((report) => <button key={report.id} onClick={() => snapshot(report.id)} aria-label={`Open snapshot ${reportLabel(report)}`} className={`timeline-entry ${report.id === pair[1] ? 'current-entry' : ''}`}><span className="timeline-dot" /><span><strong>{report.shortDate}</strong><small>{report.collectionDate ? `Collected ${report.collectionTime ?? ''}` : 'Collection date not supplied; legacy report date'}</small><small>{report.laboratory ?? report.id}</small></span></button>)}
            <div className="timeline-caption">{daysBetweenReports} days in selected pair</div>
          </div>
          <div className="sidebar-bottom">
            <div className="sidebar-quote"><Sparkles size={20} strokeWidth={1.5} /><p>Better understanding.<br />More intentional living.</p><span>ONE CHECK-IN AT A TIME.</span></div>
            <button className="privacy-sidebar" onClick={() => navigate('reports')}><ShieldCheck size={17} /><span>{isPersonal ? 'Local-only import' : 'Synthetic by design'}<small>No uploads.</small></span><ArrowUpRight size={14} /></button>
          </div>
        </aside>
        <div className="main-shell">
          <header className="topbar">
            <div className="breadcrumbs"><span>My health</span><ChevronRight size={13} /><strong>{navigation.find((item) => item.id === page)?.label}</strong></div>
            <div className="topbar-right"><span className="local-label" title={isPersonal ? 'Imported on this device, never uploaded' : 'Fictional sample readings, dates and references; not a medical record'}><span />{isPersonal ? 'Local import' : 'Sample data'}</span><div className="profile-divider" /><div className="profile-info"><strong>{person.name}</strong><span>{isPersonal ? 'Personal health journal' : 'Demo illustrations'}</span></div><div className="avatar" aria-label={person.name}>{person.initials}</div><button id="settings-trigger" className="button secondary-button settings-trigger" onClick={() => setSettingsOpen(true)} aria-haspopup="dialog"><SettingsIcon size={18} /><span>Settings</span></button></div>
          </header>
          <main id="main-content" tabIndex={-1}>
            {storageWarning && <p className="import-error storage-warning" role="alert">{storageWarning} <button className="text-button" onClick={() => setSettingsOpen(true)}>Open Settings</button></p>}
            <section className="page-heading">
              <div><div className="eyebrow">{content.eyebrow}</div><h1>{content.title}</h1><p>{content.description}</p></div>
              {page !== 'comparison' && <div className="header-actions"><button className="icon-button print-button" aria-label="Print filtered report" title="Print filtered report" onClick={() => window.print()}><Printer size={18} /></button><button className="button primary-button export-button" disabled={filtered.length === 0} onClick={exportCsv}><Download size={16} /><span>Export comparison</span></button></div>}
            </section>
            {page === 'biomarkers' && <ReportPicker onPair={changePair} />}
            {(page === 'overview' || page === 'biomarkers') && <>
              <section className="report-strip" aria-label="Report dates and viewing mode">
                <div className="report-date-pair"><span className="date-icon"><CalendarDays size={19} /></span><div className="report-date"><small>SELECTED BEFORE</small><strong>{collectionLabel(reports.earlier)}</strong></div><span className="date-arrow"><ArrowRight size={17} /></span><div className="report-date latest-date"><small>SELECTED AFTER</small><strong>{collectionLabel(reports.latest)}</strong></div></div>
                <div className="report-strip-right"><button className="report-source-link" onClick={() => navigate('reports')}><FileText size={14} />{allReports.length} source reports <ArrowUpRight size={12} /></button><div className="mode-switch" aria-label="Report view">{([{ key: 'compare', label: 'Compare' }, { key: 'latest', label: 'Later' }, { key: 'earlier', label: 'Earlier' }] as const).map((item) => <button key={item.key} className={mode === item.key ? 'selected' : ''} aria-pressed={mode === item.key} onClick={() => changeMode(item.key)}>{item.label}</button>)}</div></div>
              </section>
              {page === 'overview' && <>
                <SummaryStats mode={mode} onFilter={focusFilter} />
                <div className="insights-grid"><ComparisonChart mode={mode} onSelect={setSelected} /><PriorityCard mode={mode} onGuide={() => showGuide('vitamin-d')} onReports={() => navigate('reports')} /></div>
                <HistoryOverview onOpen={openHistoryMarker} />
              </>}
              <ResultsExplorer allMarkers={markers} filtered={filtered} filters={filters} mode={mode} expanded={page === 'biomarkers'} onFilters={setFilters} onSelect={setSelected} onExpand={() => navigate('biomarkers')} />
              {page === 'overview' && <GuidancePreview onGuide={showGuide} />}
              <MedicalNote compact />
            </>}
            {page === 'guide' && <CareGuide key={guideTopic} initialTopic={guideTopic} onSelect={setSelected} />}
            {page === 'comparison' && <AllReportsComparison onOpen={openHistoryMarker} />}
            {page === 'reports' && <ReportsPage />}
            <footer className="app-footer"><span><Activity size={15} />wellnote<span className="footer-divider">/</span>A little clarity goes a long way.</span><span><LockKeyhole size={12} />{isPersonal ? 'Personal data stays in this browser.' : 'Synthetic data only.'} No uploads.</span></footer>
          </main>
        </div>
      </div>
      {page !== 'comparison' && <PrintReport rows={filtered} mode={mode} />}
      {selected && <MarkerDetail marker={selected} onClose={() => setSelected(null)} onGuide={showGuide} />}
      {settingsOpen && <Settings onClose={() => setSettingsOpen(false)} />}
      <div className="toast-container" role="status" aria-live="polite">{toast && <div className="toast"><Check size={18} /><span>{toast}</span><button className="icon-button" aria-label="Dismiss notification" onClick={() => setToast('')}><X size={15} /></button></div>}</div>
    </>
  )
}
