import { markers } from './markers'
import { person, reports as legacyReports } from './reports'
import type { Dataset, HistoryReport, Reading } from '../types'

const report = (id: string, date: string, laboratory: string, collectionTime: string): HistoryReport => {
  const parsed = new Date(`${date}T00:00:00Z`)
  const shortDate = parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
  const fullDate = parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
  return { id, date, collectionDate: date, collectionTime, shortDate, fullDate, label: shortDate, laboratory }
}

const intermediate = (reading: Reading | null, offset: number): Reading | null => {
  if (!reading) return null
  const raw = /^\d+(\.\d+)?$/.test(reading.raw) ? String(Number((Number(reading.raw) * (1 + offset)).toFixed(2))) : reading.raw
  return { ...reading, raw, sourceLabel: 'Invented intermediate demonstration sample' }
}

export const demoDataset: Dataset = {
  schemaVersion: 2,
  person,
  reports: [
    report('demo-baseline', legacyReports.earlier.date, 'Fictional sample studio A', '09:10 AM'),
    report('demo-spring', '2024-06-14', 'Fictional sample studio B', '11:20 AM'),
    report('demo-autumn', '2024-10-14', 'Fictional sample studio A', '08:45 AM'),
    report('demo-latest', legacyReports.latest.date, 'Fictional sample studio B', '10:15 AM'),
  ],
  markers: markers.map(({ earlier, latest, ...marker }, index) => ({
    ...marker,
    readings: {
      'demo-baseline': earlier,
      'demo-spring': index % 4 === 0 ? null : intermediate(earlier ?? latest, 0.03),
      'demo-autumn': index % 5 === 0 ? null : intermediate(latest ?? earlier, -0.02),
      'demo-latest': latest,
    },
  })),
}

const iron = demoDataset.markers.find((marker) => marker.id === 'iron')!
iron.readings['demo-spring'] = {
  raw: '15.4', unit: 'µmol/L', sourceLabel: 'Invented different-unit example',
  reference: { kind: 'numeric', label: '5–30', min: 5, max: 30 },
  note: 'Different units are deliberately not converted by this app.',
}
const platelets = demoDataset.markers.find((marker) => marker.id === 'platelets')!
platelets.readings['demo-autumn'] = {
  raw: '240', unit: '10³/µL', sourceLabel: 'Invented normalized demonstration',
  reference: { kind: 'numeric', label: '150–450', min: 150, max: 450 },
  sourceRaw: '2.4', sourceUnit: '10⁵/µL', sourceReference: '1.5–4.5',
  note: 'This synthetic fixture was explicitly normalized before import.',
}
