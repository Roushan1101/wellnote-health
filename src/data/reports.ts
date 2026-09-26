import type { GroupId } from '../types'

export const person = { name: 'Alex Morgan (fictional)', initials: 'AM' }

export const reports = {
  earlier: { date: '2024-02-14', shortDate: '14 Feb 2024', fullDate: '14 February 2024', label: '14 Feb 2024' },
  latest: { date: '2025-02-14', shortDate: '14 Feb 2025', fullDate: '14 February 2025', label: '14 Feb 2025' },
} as const

export const daysBetweenReports = Math.round(
  (Date.parse(reports.latest.date) - Date.parse(reports.earlier.date)) / 86_400_000,
)

export const groups: { id: GroupId; label: string; short: string }[] = [
  { id: 'heart', label: 'Heart health', short: 'Heart' },
  { id: 'nutrition', label: 'Nutrition', short: 'Nutrition' },
  { id: 'blood', label: 'Blood count', short: 'Blood' },
  { id: 'liver', label: 'Liver health', short: 'Liver' },
  { id: 'kidney', label: 'Kidney health', short: 'Kidney' },
  { id: 'glucose', label: 'Blood glucose', short: 'Glucose' },
  { id: 'thyroid', label: 'Thyroid', short: 'Thyroid' },
  { id: 'urine', label: 'Urinalysis', short: 'Urine' },
]

export const groupLabel = (id: GroupId) => groups.find((group) => group.id === id)?.label ?? id
