import { ArrowDown, ArrowDownUp, ArrowRight, ArrowUp, ChevronLeft, ChevronRight, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react'
import { useState } from 'react'
import { groups, groupLabel } from '../data/reports'
import { useDataset } from '../DatasetContext'
import {
  defaultFilters, getChange, getTrend, rangeChanged, readingStatus, reportForMode,
  readingUnit, trendLabels,
} from '../lib/results'
import type { Filters, Marker, SortOrder, StatusFilter, TrendFilter, ViewMode } from '../types'
import { GroupIcon, StatusBadge } from './ui'

const statusOptions: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All results' },
  { value: 'attention', label: 'Needs review' },
  { value: 'high', label: 'High' },
  { value: 'low', label: 'Low' },
  { value: 'boundary', label: 'At cutoff' },
  { value: 'normal', label: 'In range / risk bands' },
  { value: 'context', label: 'Context only' },
  { value: 'missing', label: 'Not reported' },
]
const trendOptions: { value: TrendFilter; label: string }[] = [
  { value: 'all', label: 'All changes' },
  { value: 'returned', label: 'Back in range' },
  { value: 'toward', label: 'Toward range' },
  { value: 'away', label: 'Further from range' },
  { value: 'stable', label: 'Both in range' },
  { value: 'unchanged', label: 'Unchanged' },
  { value: 'new', label: 'New in latest report' },
  { value: 'missing', label: 'Missing in latest report' },
  { value: 'context', label: 'Clinical context' },
]
const sortOptions: { value: SortOrder; label: string }[] = [
  { value: 'priority', label: 'Review first' },
  { value: 'name', label: 'Name A-Z' },
  { value: 'group', label: 'Category' },
  { value: 'change', label: 'Largest % change' },
]

function selectedOption<T extends string>(value: string, options: { value: T; label: string }[]): T {
  const option = options.find((item) => item.value === value)
  if (!option) throw new Error(`Unrecognized filter selection: ${value}`)
  return option.value
}

function ChangeCell({ marker }: { marker: Marker }) {
  const { reports } = useDataset()
  const change = getChange(marker, reports)
  const trend = getTrend(marker)
  const positive = trend === 'returned' || trend === 'toward'
  const icon = change.direction === 'up' ? <ArrowUp size={13} />
    : change.direction === 'down' ? <ArrowDown size={13} /> : null
  return (
    <div className={`change-cell ${positive ? 'positive-change' : ''}`} title={change.detail}>
      <strong>{icon}{change.label}</strong>
      <span>{trendLabels[trend]}</span>
    </div>
  )
}

export function ResultsTable({
  rows, mode, onSelect,
}: {
  rows: Marker[]
  mode: ViewMode
  onSelect: (marker: Marker) => void
}) {
  const { reports, isPersonal } = useDataset()
  const report = reportForMode(mode)
  const shownReports = mode === 'compare' ? ['earlier', 'latest'] as const : [report]
  return (
    <div className="table-scroll" tabIndex={0} role="region" aria-label="Biomarker comparison table, scroll horizontally on small screens">
      <table className={`results-table ${mode !== 'compare' ? 'snapshot-table' : ''}`}>
        <caption className="sr-only">{isPersonal ? 'Locally imported' : 'Synthetic'} measurements. Select a biomarker to see provenance and guidance.</caption>
        <thead>
          <tr>
            <th scope="col">BIOMARKER</th>
            {shownReports.map((key) => <th scope="col" key={key}><span className={`column-date ${key}`}>{reports[key].collectionDate ? 'COLLECTED ' : 'LEGACY DATE '}{reports[key].shortDate.toUpperCase()}</span><br /><small>{reports[key].id}</small></th>)}
            {mode === 'compare' && <th scope="col">CHANGE</th>}
            <th scope="col">{mode === 'compare' ? 'LATER STATUS' : 'STATUS'}</th>
            <th scope="col">{isPersonal ? 'IMPORTED' : 'ILLUSTRATIVE'} REFERENCE</th>
            <th scope="col"><span className="sr-only">View details</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((marker) => (
            <tr key={marker.id} data-marker-id={marker.id}>
              <th scope="row">
                <button className="marker-name-button" onClick={() => onSelect(marker)}>
                  <span className={`table-group-icon group-${marker.group}`}><GroupIcon group={marker.group} size={16} /></span>
                  <span><strong>{marker.name}</strong><small>{groupLabel(marker.group)}</small></span>
                </button>
              </th>
              {shownReports.map((key) => {
                const reading = marker[key]
                return <td key={key} className={key === 'latest' ? 'latest-value-cell' : 'earlier-value-cell'}>
                  <span className="reading-value">{reading?.raw ?? '\u2014'}{reading && <i className={`value-indicator indicator-${readingStatus(reading)}`} aria-hidden="true" />}</span>
                  <small>{reading ? readingUnit(marker, key) : 'Not reported'}</small>
                </td>
              })}
              {mode === 'compare' && <td><ChangeCell marker={marker} /></td>}
              <td><StatusBadge marker={marker} report={report} compact /></td>
              <td className="reference-cell">
                <span>{marker[report]?.reference.label ?? 'No result'}</span>
                {mode === 'compare' && rangeChanged(marker) && <small className="range-changed">Reference changed</small>}
              </td>
              <td><button className="row-detail-button icon-button" aria-label={`Details for ${marker.name}`} onClick={() => onSelect(marker)}><ArrowRight size={16} /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ResultsExplorer({
  allMarkers, filtered, filters, mode, expanded, onFilters, onSelect, onExpand,
}: {
  allMarkers: Marker[]
  filtered: Marker[]
  filters: Filters
  mode: ViewMode
  expanded: boolean
  onFilters: (filters: Filters) => void
  onSelect: (marker: Marker) => void
  onExpand: () => void
}) {
  const { reports, isPersonal } = useDataset()
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(8)
  const [paginationKey, setPaginationKey] = useState('')
  const key = JSON.stringify([filters, mode, expanded, pageSize])
  if (key !== paginationKey) {
    setPaginationKey(key)
    setPage(0)
  }
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const activePage = Math.min(page, pages - 1)
  const visible = filtered.slice(activePage * pageSize, (activePage + 1) * pageSize)
  const activeCount = Number(Boolean(filters.query.trim())) + filters.groups.length
    + Number(filters.status !== 'all') + Number(mode === 'compare' && filters.trend !== 'all')
  const update = (patch: Partial<Filters>) => onFilters({ ...filters, ...patch })
  const reset = () => onFilters({ ...defaultFilters, groups: [] })

  return (
    <section className="results-section" id="results" aria-labelledby="results-title">
      <div className="section-heading">
        <div><div className="eyebrow">{expanded ? 'YOUR COMPLETE LAB LIBRARY' : 'THE DETAILS, WITHOUT THE GUESSWORK'}</div><h2 id="results-title">{expanded ? 'Every result. In one place.' : 'Explore your biomarkers'} <span className="count-bubble">{filtered.length}</span></h2></div>
        {!expanded && <button className="text-button" onClick={onExpand}>All biomarkers <ArrowUp size={15} className="diagonal-arrow" /></button>}
      </div>
      <div className="panel explorer-panel">
        <div className="filter-toolbar">
          <label className="search-field">
            <Search size={18} aria-hidden="true" />
            <input aria-label="Search biomarkers" placeholder="Search a biomarker..." value={filters.query} onChange={(event) => update({ query: event.target.value })} />
            {filters.query && <button className="icon-button clear-search" aria-label="Clear search" onClick={() => update({ query: '' })}><X size={14} /></button>}
          </label>
          <div className="select-field"><SlidersHorizontal size={14} aria-hidden="true" /><label htmlFor="status-filter">Status</label><select id="status-filter" value={filters.status} onChange={(event) => update({ status: selectedOption(event.target.value, statusOptions) })}>{statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
          {mode === 'compare' && <div className="select-field trend-select"><label htmlFor="trend-filter">Change</label><select id="trend-filter" value={filters.trend} onChange={(event) => update({ trend: selectedOption(event.target.value, trendOptions) })}>{trendOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>}
          <button className="reset-button" onClick={reset} disabled={!activeCount && filters.sort === 'priority'}><RotateCcw size={14} />Reset{activeCount > 0 && <span>{activeCount}</span>}</button>
        </div>
        <div className="category-slicers" aria-label="Filter by health category; select more than one">
          <button className={`category-chip ${!filters.groups.length ? 'selected' : ''}`} onClick={() => update({ groups: [] })} aria-pressed={!filters.groups.length}>All categories <span>{allMarkers.length}</span></button>
          {groups.map((group) => (
            <button key={group.id} className={`category-chip ${filters.groups.includes(group.id) ? 'selected' : ''}`}
              aria-pressed={filters.groups.includes(group.id)}
              onClick={() => update({ groups: filters.groups.includes(group.id) ? filters.groups.filter((id) => id !== group.id) : [...filters.groups, group.id] })}>
              <GroupIcon group={group.id} size={14} />{group.short}<span>{allMarkers.filter((marker) => marker.group === group.id).length}</span>
            </button>
          ))}
        </div>
        <div className="results-meta">
          <span role="status" aria-live="polite"><strong>{filtered.length}</strong> of {allMarkers.length} markers{activeCount > 0 ? ' match your filters' : ' in the selected pair'}</span>
          <label className="sort-field"><ArrowDownUp size={13} aria-hidden="true" /><span className="sr-only">Sort biomarkers</span><select aria-label="Sort biomarkers" value={filters.sort} onChange={(event) => update({ sort: selectedOption(event.target.value, sortOptions) })}>{sortOptions.filter((option) => mode === 'compare' || option.value !== 'change').map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        </div>
        {filtered.length > 0 ? <ResultsTable rows={visible} mode={mode} onSelect={onSelect} /> : (
          <div className="empty-state"><div className="empty-icon"><Search size={28} /></div><h3>No matching biomarkers</h3><p>Try a different search or loosen a category, status or change filter.</p><button className="button secondary-button" onClick={reset}>Clear all filters</button></div>
        )}
        {filtered.length > 0 && <div className="table-pagination">
          <span>Showing <strong>{activePage * pageSize + 1}-{Math.min((activePage + 1) * pageSize, filtered.length)}</strong> of {filtered.length}</span>
          <div className="pagination-controls">
            <label className="page-size"><span>Rows</span><select aria-label="Rows per page" value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}><option value={8}>8</option><option value={16}>16</option><option value={allMarkers.length}>All</option></select></label>
            <button className="icon-button pagination-button" disabled={activePage === 0} onClick={() => setPage(activePage - 1)} aria-label="Previous results page"><ChevronLeft size={16} /></button>
            <span className="page-number">{activePage + 1} / {pages}</span>
            <button className="icon-button pagination-button" disabled={activePage >= pages - 1} onClick={() => setPage(activePage + 1)} aria-label="Next results page"><ChevronRight size={16} /></button>
          </div>
        </div>}
      </div>
      <p className="results-note">Status and reference use the {reports[reportForMode(mode)].shortDate} {isPersonal ? 'imported' : 'fictional'} report. &ldquo;At cutoff&rdquo; respects strict &lt; / &gt; limits; &ldquo;Context only&rdquo; is not an abnormal flag. Select any marker for provenance.</p>
    </section>
  )
}
