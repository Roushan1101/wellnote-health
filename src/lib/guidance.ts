import { guidance as topicGuidance } from '../data/guidance'
import { groups, groupLabel } from '../data/reports'
import type { Guidance, Marker, ReportMetadata } from '../types'
import { reportLabel } from './history'
import { needsAttention, readingStatus, readingUnit } from './results'

export function buildGuidance(markers: Marker[], report: ReportMetadata, historical: boolean): Guidance[] {
  const flagged = markers.filter((marker) => needsAttention(readingStatus(marker.latest)))
  const plans = topicGuidance.flatMap((plan) => {
    const relevant = flagged.filter((marker) => plan.markerIds.includes(marker.id))
    if (!relevant.length) return []
    if (plan.medications && !relevant.some((marker) => readingStatus(marker.latest) === 'low')) {
      return [{
        ...plan, markerIds: relevant.map((marker) => marker.id), medications: undefined,
        title: `${relevant[0]!.name}: review the flagged result`,
        foods: ['Maintain a balanced diet appropriate to your health. This is not a low result; increasing this nutrient is not a corrective food plan.'],
        habits: ['Review the original report, current supplements, medicines and symptoms with a clinician.'],
        clinician: ['What explains this result, and does it need confirmation? A high or boundary result must not trigger deficiency replacement.'],
        caution: 'No replacement medication is suggested for this result. Do not start, stop or change prescribed treatment without clinical advice.',
      }]
    }
    return [{ ...plan, markerIds: relevant.map((marker) => marker.id) }]
  })
  const covered = new Set(plans.flatMap((plan) => plan.markerIds))
  for (const group of groups) {
    const remaining = flagged.filter((marker) => marker.group === group.id && !covered.has(marker.id))
    if (!remaining.length) continue
    plans.push({
      id: `review-${group.id}`,
      group: group.id,
      title: `${groupLabel(group.id)} results to review`,
      eyebrow: '',
      markerIds: remaining.map((marker) => marker.id),
      summary: '',
      foods: ['Maintain a suitable balanced eating pattern. A flag alone does not identify a deficiency or justify a corrective food or supplement.'],
      habits: ['Bring the original reports, recent symptoms, sampling conditions and medication or supplement history to a qualified clinician.'],
      clinician: [
        'What does this result mean alongside the full panel, symptoms and medical history?',
        'Are the source units, reference interval and sampling conditions appropriate? Would confirmation or repeat testing help before considering treatment?',
      ],
      caution: 'General review context, not a treatment plan. Do not start iron, vitamins or other medicines from a flag alone; confirm any deficiency or treatment need with a clinician.',
      sources: [{ title: 'MedlinePlus: Understanding lab tests', url: 'https://medlineplus.gov/lab-tests/how-to-understand-your-lab-results/' }],
    })
  }
  return plans.map((plan) => ({
    ...plan,
    eyebrow: `GENERAL EDUCATION / ${historical ? 'HISTORICAL SELECTION' : 'SELECTED LATER REPORT'}`,
    summary: `${flagged.filter((marker) => plan.markerIds.includes(marker.id)).map((marker) => `${marker.name}: ${marker.latest!.raw}${readingUnit(marker, 'latest') ? ` ${readingUnit(marker, 'latest')}` : ''} (${readingStatus(marker.latest)})`).join('; ')}. ${reportLabel(report)}. Flags use that report’s references, not a diagnosis or treatment recommendation.`,
  }))
}
