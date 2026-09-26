import { describe, expect, it } from 'vitest'
import { guidanceForMarker } from './guidance'

describe('supported educational guidance', () => {
  it.each([
    'vitamin-d', 'vitamin-b12', 'total-cholesterol', 'ldl', 'hdl',
    'non-hdl', 'hdl-ldl-ratio', 'triglycerides', 'lymphocytes', 'ggt', 'alt',
  ])('includes food and clinician discussion for %s', (id) => {
    const plan = guidanceForMarker(id)
    expect(plan).toBeDefined()
    expect(plan?.foods.length).toBeGreaterThan(0)
    expect(plan?.clinician.length).toBeGreaterThan(0)
    expect(plan?.caution.length).toBeGreaterThan(0)
  })

  it('frames medicines conditionally and does not prescribe doses', () => {
    expect(guidanceForMarker('vitamin-d')?.clinician.join(' ')).toContain('If vitamin D deficiency is clinically confirmed')
    expect(guidanceForMarker('ldl')?.clinician.join(' ')).toContain('If LDL-lowering treatment is indicated')
    expect(guidanceForMarker('hdl')?.clinician.join(' ')).toContain('not a reason to self-start medicine')
    expect(guidanceForMarker('ggt')?.clinician.join(' ')).toContain('generally does not need food or medicine to raise it')
  })
})
