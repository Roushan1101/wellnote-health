import { describe, expect, it } from 'vitest'
import { groups, reports } from '../data/reports'
import { guidance as supportedGuidance } from '../data/guidance'
import type { Marker } from '../types'
import { buildGuidance } from './guidance'
import { displayStatus, getChange, readingStatus, readingUnit } from './results'

// Abstract invented readings, not extracted laboratory results.
const example = (id = 'example-reading'): Marker => ({
  id, name: 'Invented example', group: 'blood', unit: 'example units', priority: 10,
  earlier: { raw: '7', sourceLabel: 'Fictional test fixture', reference: { kind: 'numeric', label: '0–10', min: 0, max: 10 } },
  latest: { raw: '11', sourceLabel: 'Fictional test fixture', reference: { kind: 'numeric', label: '0–10', min: 0, max: 10 } },
})

describe('safe general review context', () => {
  it('covers every otherwise unsupported group flag without targeted treatment', () => {
    const rows = groups.map((group) => ({ ...example(`example-${group.id}`), group: group.id }))
    const plans = buildGuidance(rows, reports.latest, false)
    expect(plans).toHaveLength(8)
    expect(new Set(plans.flatMap((plan) => plan.markerIds)).size).toBe(8)
    expect(plans.every((plan) => plan.id.startsWith('review-'))).toBe(true)
    expect(plans.every((plan) => plan.caution.includes('confirm any deficiency or treatment need'))).toBe(true)
  })
  it('preserves strengthened supported guidance and avoids duplicate coverage', () => {
    const marker = { ...example('hdl'), group: 'heart' as const }
    const plans = buildGuidance([marker], reports.latest, true)
    expect(plans).toHaveLength(1)
    expect(plans[0]?.id).toBe('heart')
    expect(plans[0]?.clinician).toEqual(supportedGuidance.find((plan) => plan.id === 'heart')!.clinician)
    expect(plans[0]?.eyebrow).toContain('HISTORICAL')
  })
  it('does not turn missing or unscored references into review flags', () => {
    const marker = example()
    marker.latest!.reference = { kind: 'context', label: 'No numeric reference supplied' }
    expect(readingStatus(marker.latest)).toBe('context')
    expect(buildGuidance([marker], reports.latest, false)).toEqual([])
    marker.latest = null
    expect(buildGuidance([marker], reports.latest, false)).toEqual([])
  })
  it('preserves blank/malformed reading units and suppresses cross-unit deltas', () => {
    for (const unit of ['', 'unrecognized/unit']) {
      const marker = example()
      marker.latest!.unit = unit
      expect(readingUnit(marker, 'latest')).toBe(unit)
      expect(getChange(marker)).toMatchObject({ label: 'Units differ', amount: null, percent: null })
    }
  })
  it('preserves strict reference targets rather than substituting risk-band interpretation', () => {
    const marker = example('hscrp')
    marker.unit = 'mg/L'
    marker.latest!.raw = '2'
    marker.latest!.reference = { kind: 'numeric', label: '<1', max: 1, maxExclusive: true }
    expect(readingStatus(marker.latest)).toBe('high')
    expect(displayStatus(marker, 'latest')).toBe('High')
    marker.latest!.raw = '1'
    expect(displayStatus(marker, 'latest')).toBe('At cutoff')
  })
  it('keeps distinct test IDs distinct in general review coverage', () => {
    const random = { ...example('random-glucose'), group: 'glucose' as const }
    const fasting = { ...example('fasting-glucose'), group: 'glucose' as const }
    const plans = buildGuidance([random, fasting], reports.latest, false)
    expect(plans[0]?.markerIds).toEqual(['random-glucose', 'fasting-glucose'])
  })
})
