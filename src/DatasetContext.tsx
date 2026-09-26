import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { guidance as demoGuidance } from './data/guidance'
import { demoDataset, parseDataset, validateDataset } from './lib/dataset'
import { needsAttention, readingStatus } from './lib/results'
import type { Dataset, Guidance, Marker } from './types'

export const storageKey = () => `wellnote-local-dataset:v1:${window.location.pathname}`

interface DatasetState {
  dataset: Dataset
  isPersonal: boolean
  saved: boolean
  revision: number
  storageWarning: string
}

interface DatasetContextValue extends DatasetState, Dataset {
  guidance: Guidance[]
  findMarker: (id: string) => Marker
  loadDataset: (dataset: Dataset, remember: boolean) => void
  clearData: () => void
}

const DatasetContext = createContext<DatasetContextValue | null>(null)

function initialState(): DatasetState {
  const state = { dataset: demoDataset, isPersonal: false, saved: false, revision: 0, storageWarning: '' }
  try {
    const saved = localStorage.getItem(storageKey())
    if (saved) return { ...state, dataset: parseDataset(saved), isPersonal: true, saved: true }
  } catch {
    state.storageWarning = 'Saved browser data could not be loaded. Demo shown instead. Clear site storage if this persists.'
  }
  return state
}

export function DatasetProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DatasetState>(initialState)
  const value = useMemo<DatasetContextValue>(() => {
    const findMarker = (id: string) => {
      const marker = state.dataset.markers.find((item) => item.id === id)
      if (!marker) throw new Error('The loaded dataset is missing a required measurement.')
      return marker
    }
    const guidance = state.isPersonal
      ? demoGuidance.flatMap((plan) => {
        const relevant = state.dataset.markers.filter((marker) => plan.markerIds.includes(marker.id) && needsAttention(readingStatus(marker.latest)))
        if (!relevant.length) return []
        return [{
          ...plan,
          eyebrow: 'GENERAL EDUCATION / IMPORTED RESULTS',
          markerIds: relevant.map((marker) => marker.id),
          summary: `${relevant.map((marker) => `${marker.name}: ${marker.latest!.raw}${marker.unit ? ` ${marker.unit}` : ''} (${readingStatus(marker.latest)})`).join('; ')}. Flags use each imported reference. They do not establish a diagnosis or treatment need.`,
          caution: 'General education only. Do not start, stop or dose medication or supplements from app flags. Discuss actual concerns with a qualified clinician.',
        }]
      })
      : demoGuidance
    return {
      ...state, ...state.dataset, guidance, findMarker,
      loadDataset(dataset, remember) {
        const validated = validateDataset(dataset)
        try {
          if (remember) localStorage.setItem(storageKey(), JSON.stringify(validated))
          else localStorage.removeItem(storageKey())
        } catch {
          if (remember || state.saved) throw new Error('Browser storage could not be updated. Disable “Remember” for memory-only use, or clear this site’s storage in browser settings first.')
        }
        setState((current) => ({ dataset: validated, isPersonal: true, saved: remember, revision: current.revision + 1, storageWarning: '' }))
      },
      clearData() {
        let warning = ''
        try { localStorage.removeItem(storageKey()) } catch { warning = 'Memory cleared, but browser storage could not be removed. Clear this site’s storage in browser settings before reloading.' }
        setState((current) => ({ dataset: demoDataset, isPersonal: false, saved: false, revision: current.revision + 1, storageWarning: warning }))
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
