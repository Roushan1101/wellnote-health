import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { demoDataset, parseDataset, validateDataset } from './lib/dataset'
import { defaultPair, projectDataset } from './lib/history'
import { buildGuidance } from './lib/guidance'
import type { Dataset, Guidance, HistoryReport, Marker, PairReports, Person } from './types'

export const storageKey = () => `wellnote-local-dataset:v1:${window.location.pathname}`

interface DatasetState {
  dataset: Dataset
  isPersonal: boolean
  saved: boolean
  revision: number
  storageWarning: string
  pair: [string, string]
}

interface DatasetContextValue extends DatasetState {
  person: Person
  reports: PairReports
  allReports: HistoryReport[]
  markers: Marker[]
  unavailable: number
  historical: boolean
  guidance: Guidance[]
  findMarker: (id: string) => Marker | undefined
  selectPair: (first: string, second: string) => void
  loadDataset: (dataset: Dataset, remember: boolean) => void
  clearData: () => void
}

const DatasetContext = createContext<DatasetContextValue | null>(null)

function initialState(): DatasetState {
  const state = { dataset: demoDataset, isPersonal: false, saved: false, revision: 0, storageWarning: '', pair: defaultPair(demoDataset) }
  try {
    const saved = localStorage.getItem(storageKey())
    if (saved) {
      const dataset = parseDataset(saved)
      return { ...state, dataset, pair: defaultPair(dataset), isPersonal: true, saved: true }
    }
  } catch {
    state.storageWarning = 'Saved browser data could not be loaded. Demo shown instead. Clear site storage if this persists.'
  }
  return state
}

export function DatasetProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DatasetState>(initialState)
  const value = useMemo<DatasetContextValue>(() => {
    const projected = projectDataset(state.dataset, ...state.pair)
    const findMarker = (id: string) => projected.markers.find((item) => item.id === id)
    const historical = projected.reports.latest.id !== state.dataset.reports.at(-1)!.id
    const guidance = buildGuidance(projected.markers, projected.reports.latest, historical)
    return {
      ...state, ...projected, person: state.dataset.person, allReports: state.dataset.reports, historical, guidance, findMarker,
      selectPair(first, second) {
        const { pair } = projectDataset(state.dataset, first, second)
        setState((current) => ({ ...current, pair }))
      },
      loadDataset(dataset, remember) {
        const validated = validateDataset(dataset)
        try {
          if (remember) localStorage.setItem(storageKey(), JSON.stringify(validated))
          else localStorage.removeItem(storageKey())
        } catch {
          if (remember || state.saved) throw new Error('Browser storage could not be updated. Disable “Remember” for memory-only use, or clear this site’s storage in browser settings first.')
        }
        setState((current) => ({ dataset: validated, pair: defaultPair(validated), isPersonal: true, saved: remember, revision: current.revision + 1, storageWarning: '' }))
      },
      clearData() {
        let warning = ''
        try { localStorage.removeItem(storageKey()) } catch { warning = 'Memory cleared, but browser storage could not be removed. Clear this site’s storage in browser settings before reloading.' }
        setState((current) => ({ dataset: demoDataset, pair: defaultPair(demoDataset), isPersonal: false, saved: false, revision: current.revision + 1, storageWarning: warning }))
      },
    }
  }, [state])
  return <DatasetContext.Provider value={value}>{children}</DatasetContext.Provider>
}

export function useDataset() {
  const context = useContext(DatasetContext)
  if (!context) throw new Error('Dataset provider is unavailable.')
  return context
}
