import { demoDataset } from './dataset'
import type { Dataset } from '../types'

export function createSyntheticReport(key: string, dataset: Dataset = demoDataset, isPersonal = false) {
  const { markers, person, reports } = dataset
  const report = reports.find((report) => report.id === key) ?? (key === 'earlier' ? reports[0] : key === 'latest' ? reports.at(-1) : undefined)
  if (!report) throw new Error('Unknown report ID.')
  return {
    notice: isPersonal ? 'PERSONAL LOCAL IMPORT - KEEP PRIVATE. References are not independently verified.' : 'SYNTHETIC PUBLIC DEMO - NOT A MEDICAL RECORD. All values and references are illustrative.',
    profile: person.name,
    report,
    provenance: isPersonal ? 'Locally imported JSON. No original PDF attached.' : 'Hand-authored fictional fixtures. No real patient or laboratory source.',
    measurements: markers.filter((marker) => marker.readings[report.id]).map((marker) => ({
      id: marker.id, name: marker.name, category: marker.group, unit: marker.readings[report.id]?.unit ?? marker.unit, reading: marker.readings[report.id],
    })),
  }
}
