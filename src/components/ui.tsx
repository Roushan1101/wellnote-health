import {
  Activity, ArrowDown, ArrowUp, Bean, Check, CircleHelp, Droplet, Droplets,
  FlaskConical, Heart, Minus, Sparkles, Sun, TriangleAlert,
} from 'lucide-react'
import type { GroupId, Marker, ReportKey, Status } from '../types'
import { displayStatus, readingStatus, statusLabels } from '../lib/results'
import { useDataset } from '../DatasetContext'

export function GroupIcon({ group, size = 18 }: { group: GroupId; size?: number }) {
  const icons = {
    heart: Heart, nutrition: Sun, blood: Droplet, liver: Activity,
    kidney: Bean, glucose: Droplets, thyroid: Sparkles, urine: FlaskConical,
  }
  const Icon = icons[group]
  return <Icon size={size} strokeWidth={1.7} aria-hidden="true" />
}

export function StatusBadge({
  marker, report = 'latest', status: suppliedStatus, compact = false,
}: {
  marker?: Marker
  report?: ReportKey
  status?: Status
  compact?: boolean
}) {
  const status = suppliedStatus ?? (marker ? readingStatus(marker[report]) : 'context')
  const label = marker ? displayStatus(marker, report) : statusLabels[status]
  const icons = {
    normal: Check, high: ArrowUp, low: ArrowDown, boundary: Minus,
    context: CircleHelp, missing: Minus, review: TriangleAlert,
  }
  const Icon = icons[status]
  return (
    <span className={`status-badge status-${status}${compact ? ' compact' : ''}`}>
      <Icon size={12} strokeWidth={2} aria-hidden="true" />
      {label}
    </span>
  )
}

export function MedicalNote({ compact = false }: { compact?: boolean }) {
  const { isPersonal } = useDataset()
  return (
    <div className={`medical-note${compact ? ' compact-note' : ''}`}>
      <CircleHelp size={17} strokeWidth={1.8} aria-hidden="true" />
      <p>
        <strong>A clearer picture, not a diagnosis.</strong>{' '}
        {isPersonal ? 'Locally imported references are not independently verified. Flags are not a diagnosis, prescription or dose recommendation. Discuss actual concerns with a qualified clinician.' : compact
          ? 'All results and ranges are synthetic illustrations, not personal medical advice.'
          : 'These educational examples use fictional reports and illustrative ranges, not real lab records. They are not a prescription. Discuss actual health concerns with a qualified clinician.'}
      </p>
    </div>
  )
}
