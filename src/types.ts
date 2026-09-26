export type ReportKey = 'earlier' | 'latest'
export type ViewMode = 'compare' | ReportKey
export type PageId = 'overview' | 'biomarkers' | 'guide' | 'reports'
export type GroupId = 'heart' | 'nutrition' | 'blood' | 'liver' | 'kidney' | 'glucose' | 'thyroid' | 'urine'

export interface NumericReference {
  kind: 'numeric'
  label: string
  min?: number
  max?: number
  minExclusive?: boolean
  maxExclusive?: boolean
  nilIsZero?: boolean
}

export interface TextReference {
  kind: 'text'
  label: string
  accepted: string[]
}

export interface ContextReference {
  kind: 'context'
  label: string
}

export type Reference = NumericReference | TextReference | ContextReference

export interface Reading {
  raw: string
  page?: number
  reference: Reference
  sourceLabel: string
}

export interface Marker {
  id: string
  name: string
  group: GroupId
  unit: string
  earlier: Reading | null
  latest: Reading | null
  note?: string
  priority: number
}

export type Status = 'normal' | 'high' | 'low' | 'boundary' | 'context' | 'missing' | 'review'
export type Trend = 'returned' | 'toward' | 'away' | 'stable' | 'unchanged' | 'context' | 'new' | 'missing'
export type StatusFilter = 'all' | 'attention' | Status
export type TrendFilter = 'all' | Trend
export type SortOrder = 'priority' | 'name' | 'group' | 'change'

export interface Filters {
  query: string
  groups: GroupId[]
  status: StatusFilter
  trend: TrendFilter
  sort: SortOrder
}

export type ParsedValue =
  | { kind: 'exact'; value: number }
  | { kind: 'less'; value: number }
  | { kind: 'greater'; value: number }
  | { kind: 'interval'; min: number; max: number }
  | { kind: 'text'; value: string }

export interface Guidance {
  id: string
  group: GroupId
  title: string
  eyebrow: string
  markerIds: string[]
  summary: string
  foods: string[]
  habits: string[]
  clinician: string[]
  caution: string
  sources: { title: string; url: string }[]
}

export interface Person {
  name: string
  initials: string
  firstName?: string
  latestReportedAge?: number
  reportedSex?: string
}

export interface ReportMetadata {
  date: string
  label: string
  fullDate: string
  shortDate: string
  id?: string
  year?: number
  pages?: number
  filename?: string
  age?: number
}

export interface Dataset {
  schemaVersion: 1
  person: Person
  reports: Record<ReportKey, ReportMetadata>
  markers: Marker[]
}
