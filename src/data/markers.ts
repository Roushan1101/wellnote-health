import type { GroupId, Marker, NumericReference, Reading, Reference } from '../types'

// Hand-authored fictional fixtures, not transcribed or anonymized patient results.
const range = (label: string, min?: number, max?: number, extra: Partial<NumericReference> = {}): NumericReference =>
  ({ kind: 'numeric', label, min, max, ...extra })
const reading = (raw: string | null, reference: Reference): Reading | null =>
  raw === null ? null : { raw, reference, sourceLabel: 'Synthetic demonstration fixture' }
const fixture = (
  id: string, name: string, group: GroupId, unit: string,
  before: string | null, after: string | null, reference: Reference,
  priority = 100, earlierReference = reference,
): Marker => ({
  id, name, group, unit, priority,
  earlier: reading(before, earlierReference), latest: reading(after, reference),
  note: 'Invented example for testing the interface. Reference ranges are illustrative, not a clinical standard or a personal medical record.',
})

export const markers: Marker[] = [
  fixture('total-cholesterol', 'Total cholesterol', 'heart', 'mg/dL', '226', '203', range('<200', undefined, 200, { maxExclusive: true }), 20),
  fixture('ldl', 'LDL cholesterol', 'heart', 'mg/dL', '148', '124', range('<100', undefined, 100, { maxExclusive: true }), 21),
  fixture('hdl', 'HDL cholesterol', 'heart', 'mg/dL', '46', '54', range('>40', 40, undefined, { minExclusive: true }), 22),
  fixture('non-hdl', 'Non-HDL cholesterol', 'heart', 'mg/dL', '180', '149', range('<130', undefined, 130, { maxExclusive: true }), 23),
  fixture('hdl-ldl-ratio', 'HDL/LDL ratio', 'heart', '', '0.31', '0.44', { kind: 'context', label: 'Illustrative ratio; context only' }),
  fixture('triglycerides', 'Triglycerides', 'heart', 'mg/dL', '162', '125', range('<150', undefined, 150, { maxExclusive: true })),
  fixture('hscrp', 'High-sensitivity CRP', 'heart', 'mg/L', '1.8', '<0.7', range('≤3 (illustrative band)', undefined, 3)),
  fixture('vitamin-d', 'Vitamin D', 'nutrition', 'ng/mL', '24', '18', range('30–100', 30, 100), 10),
  fixture('vitamin-b12', 'Vitamin B12', 'nutrition', 'pg/mL', '235', '318', range('250–950', 250, 950), 50, range('200–900', 200, 900)),
  fixture('iron', 'Serum iron', 'nutrition', 'µg/dL', '58', '83', range('60–170', 60, 170)),
  fixture('magnesium', 'Magnesium', 'nutrition', 'mg/dL', null, '2.05', range('1.7–2.4', 1.7, 2.4)),
  fixture('hemoglobin', 'Hemoglobin', 'blood', 'g/dL', '13.6', '14.1', range('12–17', 12, 17)),
  fixture('lymphocytes', 'Lymphocytes', 'blood', '%', '34', '43', range('20–40', 20, 40), 40),
  fixture('platelets', 'Platelets', 'blood', '10³/µL', '248', '261', range('150–450', 150, 450)),
  fixture('ggt', 'GGT', 'liver', 'U/L', '51', '44', range('10–60', 10, 60)),
  fixture('alt', 'ALT', 'liver', 'U/L', '47', '29', range('7–45', 7, 45)),
  fixture('creatinine', 'Creatinine', 'kidney', 'mg/dL', '0.86', '0.91', range('0.6–1.2', 0.6, 1.2)),
  fixture('egfr', 'Estimated GFR', 'kidney', 'mL/min/1.73m²', '112', '106', range('≥90', 90)),
  fixture('fasting-glucose', 'Fasting glucose', 'glucose', 'mg/dL', '103', '94', range('70–99', 70, 99)),
  fixture('hba1c', 'HbA1c', 'glucose', '%', '5.8', '5.7', range('<5.7', undefined, 5.7, { maxExclusive: true }), 30),
  fixture('tsh', 'TSH', 'thyroid', 'mIU/L', '3.8', '3.1', range('0.5–4.5', 0.5, 4.5), 100, range('0.4–4.0', 0.4, 4)),
  fixture('free-t4', 'Free T4', 'thyroid', 'ng/dL', '1.06', '1.19', range('0.8–1.8', 0.8, 1.8)),
  fixture('urine-protein', 'Urine protein', 'urine', '', 'Negative', 'Negative', { kind: 'text', label: 'Negative', accepted: ['Negative'] }),
  fixture('urine-ph', 'Urine pH', 'urine', '', '6.2', '6.8', range('5–8', 5, 8)),
  fixture('sample-volume', 'Sample volume', 'urine', 'mL', '28', null, { kind: 'context', label: 'Collection context only' }),
]

export function findMarker(id: string): Marker {
  const marker = markers.find((item) => item.id === id)
  if (!marker) throw new Error(`Unknown synthetic marker: ${id}`)
  return marker
}
