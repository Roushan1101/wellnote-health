import type { Guidance } from '../types'

export const guidance: Guidance[] = [
  {
    id: 'vitamin-d', group: 'nutrition', title: 'A conversation about vitamin D',
    eyebrow: 'FICTIONAL SCENARIO / NUTRITION', markerIds: ['vitamin-d', 'vitamin-b12'],
    summary: 'This synthetic example shows a low vitamin D flag and a changed B12 reference range. It does not describe a real person or establish a treatment need.',
    foods: [
      'A varied diet can include fortified foods and sources such as eggs or oily fish, where suitable. Check labels: not every milk or plant drink contains added vitamin D.',
      'Vitamin B12 has different dietary sources and treatment needs. Discuss restricted diets or absorption concerns rather than assuming any vitamin supplement will address either result.',
    ],
    habits: ['Discuss nutrition, lifestyle and relevant symptoms with a qualified clinician. Avoid unsafe sun exposure.'],
    clinician: [
      'How should a result be interpreted alongside history, symptoms and the test method? Would follow-up testing be useful?',
      'If vitamin D deficiency is clinically confirmed, ask about vitamin D3 (cholecalciferol) or D2 replacement and appropriate monitoring. A clinician should choose the dose and duration; a high vitamin D result must not prompt more supplementation.',
    ],
    caution: 'Do not choose supplements or doses from app flags. Excess vitamin D can raise calcium and harm the kidneys. A clinician should assess individual needs.',
    sources: [{ title: 'NIH: Vitamin D', url: 'https://ods.od.nih.gov/factsheets/VitaminD-Consumer/' }],
  },
  {
    id: 'heart', group: 'heart', title: 'Put cholesterol in context',
    eyebrow: 'FICTIONAL SCENARIO / HEART', markerIds: ['total-cholesterol', 'ldl', 'hdl', 'non-hdl', 'hdl-ldl-ratio', 'triglycerides'],
    summary: 'The invented cholesterol values demonstrate movement toward an illustrative reference range. A number or app flag alone cannot determine cardiovascular risk.',
    foods: [
      'Consider vegetables, beans, oats, nuts and other fibre-rich foods within a balanced diet that suits your needs.',
      'Replace some butter, ghee, fatty meats and fried snacks with unsaturated oils, nuts, seeds or fish where suitable. These are general dietary options, not a treatment for every abnormal lipid value.',
    ],
    habits: [
      'Choose enjoyable movement and a sustainable routine appropriate to your health and ability. Build gradually toward regular moderate activity.',
      'Avoid tobacco. Do not start drinking alcohol or taking supplements just to raise HDL.',
    ],
    clinician: [
      'Which other factors matter for overall cardiovascular risk, and which targets are appropriate for an individual?',
      'If LDL-lowering treatment is indicated after a risk assessment, statins are a common option to discuss. An app flag cannot establish that you need one; interactions, benefits and risks require clinical review.',
      'Low HDL or a cholesterol ratio alone is not a reason to self-start medicine. A rounded result at a strict cutoff needs interpretation, not treatment of the ratio itself.',
    ],
    caution: 'Do not start, stop or change medication based on this app. Personal treatment targets can differ from a laboratory reference interval.',
    sources: [{ title: 'NHLBI: Blood cholesterol', url: 'https://www.nhlbi.nih.gov/health/blood-cholesterol' }],
  },
  {
    id: 'blood', group: 'blood', title: 'Look beyond an isolated flag',
    eyebrow: 'FICTIONAL SCENARIO / BLOOD COUNT', markerIds: ['lymphocytes'],
    summary: 'A fictional percentage outside a reference range illustrates why flags need context. Percentages and absolute counts answer different questions.',
    foods: ['Aim for varied meals rather than trying to correct a blood count flag with one food.'],
    habits: ['For a real consultation, bring relevant symptoms, recent illnesses and medication history.'],
    clinician: [
      'Would an absolute count or repeat test provide useful context? A high percentage can coexist with an absolute count in range.',
      'There is no medicine to recommend from a lymphocyte percentage alone. Antibiotics, steroids or other treatments require a clinical diagnosis.',
    ],
    caution: 'Do not infer infection, deficiency or another diagnosis from an isolated percentage. Persistent fever, unexplained weight loss, night sweats or swollen lymph nodes warrant medical review.',
    sources: [{ title: 'MedlinePlus: Blood differential', url: 'https://medlineplus.gov/lab-tests/blood-differential/' }],
  },
  {
    id: 'liver', group: 'liver', title: 'Read liver markers together',
    eyebrow: 'FICTIONAL SCENARIO / LIVER', markerIds: ['ggt', 'alt'],
    summary: 'The synthetic liver examples show how two snapshots can differ. An in-range result is not proof of overall liver health.',
    foods: ['Build a balanced eating pattern rather than using products marketed as liver cleanses.'],
    habits: ['Discuss alcohol use, medicines and supplements openly with a clinician.'],
    clinician: [
      'How do these tests fit the wider panel and clinical history?',
      'An isolated low GGT is usually not concerning and generally does not need food or medicine to raise it. High results or other abnormal liver tests require different clinical interpretation.',
    ],
    caution: 'Avoid self-prescribed detox products. Do not stop prescribed medicines or increase alcohol intake to change a test result.',
    sources: [{ title: 'MedlinePlus: Liver function tests', url: 'https://medlineplus.gov/lab-tests/liver-function-tests/' }],
  },
]

export const guidanceForMarker = (id: string) => guidance.find((plan) => plan.markerIds.includes(id))
