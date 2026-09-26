import { demoDataset } from './dataset'
import type { Dataset, ReportKey } from '../types'

export function createSyntheticReport(key: ReportKey, dataset: Dataset = demoDataset, isPersonal = false) {
  const { markers, person, reports } = dataset
  return {
    notice: isPersonal ? 'PERSONAL LOCAL IMPORT - KEEP PRIVATE. References are not independently verified.' : 'SYNTHETIC PUBLIC DEMO - NOT A MEDICAL RECORD. All values and references are illustrative.',
    profile: person.name,
    report: reports[key],
    provenance: isPersonal ? 'Locally imported JSON. No original PDF attached.' : 'Hand-authored fictional fixtures. No real patient or laboratory source.',
    measurements: markers.filter((marker) => marker[key]).map((marker) => ({
      id: marker.id, name: marker.name, category: marker.group, unit: marker.unit, reading: marker[key],
    })),
  }
}
