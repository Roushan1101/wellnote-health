import type { Guidance } from '../types'

export const nutrientGuidance: Guidance[] = [
  {
    id: 'vitamin-d', group: 'nutrition', title: 'A conversation about vitamin D',
    eyebrow: 'GENERAL NUTRIENT EDUCATION', markerIds: ['vitamin-d'],
    summary: 'A low laboratory result needs clinical interpretation before treatment.',
    foods: [
      'Oily fish such as salmon or sardines, if suitable for your diet.',
      'Vitamin-D-fortified milk or plant drinks; check the label for added vitamin D.',
      'Egg yolks as part of a varied diet. Food alone may not correct a confirmed deficiency.',
    ],
    habits: ['Discuss nutrition, lifestyle and relevant symptoms with a qualified clinician. Avoid unsafe sun exposure.'],
    clinician: [
      'If vitamin D deficiency is clinically confirmed, ask whether replacement and follow-up calcium or vitamin D testing are appropriate.',
      'A clinician should choose the preparation, dose and duration. These are alternatives to discuss, not two products to take together.',
    ],
    medications: [
      { name: 'Vitamin D3 (cholecalciferol)', note: 'A common oral replacement option for confirmed deficiency; strength and monitoring depend on clinical assessment.' },
      { name: 'Vitamin D2 (ergocalciferol)', note: 'An alternative vitamin D preparation a clinician may consider. Do not combine it with D3 unless specifically instructed.' },
    ],
    caution: 'Do not choose supplements or doses from app flags. Excess vitamin D can raise calcium and harm the kidneys. A high vitamin D result must not prompt more supplementation.',
    sources: [
      { title: 'NIH: Vitamin D', url: 'https://ods.od.nih.gov/factsheets/VitaminD-Consumer/' },
      { title: 'NHS: Colecalciferol', url: 'https://www.nhs.uk/medicines/colecalciferol/about-colecalciferol/' },
    ],
  },
  {
    id: 'vitamin-b12', group: 'nutrition', title: 'A conversation about vitamin B12',
    eyebrow: 'GENERAL NUTRIENT EDUCATION', markerIds: ['vitamin-b12'],
    summary: 'Low B12 can reflect dietary intake or absorption problems; these need different care.',
    foods: [
      'Fish such as salmon, if suitable for your diet.',
      'Milk or yogurt, where tolerated.',
      'B12-fortified breakfast cereal or nutritional yeast; check the label, especially with a vegan diet.',
    ],
    habits: ['Discuss restricted diets, digestive conditions and medicines that can affect absorption. New numbness, balance changes or weakness warrant prompt clinical review.'],
    clinician: [
      'Is B12 deficiency confirmed, and could symptoms, blood counts or additional testing help establish the cause?',
      'Diet may not correct an absorption problem. Ask which route is appropriate; these options are not a combined self-treatment plan.',
    ],
    medications: [
      { name: 'Cyanocobalamin', note: 'An oral B12 option a clinician may consider, depending on the cause and severity of confirmed deficiency.' },
      { name: 'Hydroxocobalamin', note: 'An injectable B12 option administered under clinical supervision, particularly when injections are indicated.' },
    ],
    caution: 'Do not delay evaluation of neurological symptoms or assume that food alone will treat an absorption disorder. Treatment route, dose and duration require clinical advice.',
    sources: [
      { title: 'NIH: Vitamin B12', url: 'https://ods.od.nih.gov/factsheets/VitaminB12-Consumer/' },
      { title: 'NHS: Cyanocobalamin and B12 replacement', url: 'https://www.nhs.uk/medicines/cyanocobalamin/about-cyanocobalamin/' },
    ],
  },
  {
    id: 'iron', group: 'nutrition', title: 'Confirm the cause of low iron',
    eyebrow: 'GENERAL NUTRIENT EDUCATION', markerIds: ['iron'],
    summary: 'Serum iron alone does not diagnose iron deficiency or establish a need for iron tablets.',
    foods: [
      'Lentils or beans, paired with vitamin-C-rich vegetables to support absorption.',
      'Tofu as a plant-based iron source.',
      'Iron-fortified cereal; check the label and choose an option suitable for your diet.',
    ],
    habits: ['Discuss ferritin, transferrin saturation, blood counts, inflammation and possible blood loss rather than treating an isolated serum iron result.'],
    clinician: [
      'Is iron deficiency confirmed, and what is causing it? A low haemoglobin or screening index alone does not establish the cause.',
      'If oral iron is indicated, ask about one suitable preparation and follow-up tests. The examples are alternatives, not medicines to combine.',
    ],
    medications: [
      { name: 'Ferrous sulfate', note: 'A common oral iron option for confirmed deficiency. A clinician should review tolerability, interactions and monitoring.' },
      { name: 'Ferrous fumarate', note: 'An alternative oral iron salt. Products contain different amounts of elemental iron and are not dose-for-dose substitutes.' },
    ],
    caution: 'Do not start iron from a single low value, high UIBC or screening index. Unnecessary iron can be harmful; keep iron medicines out of children’s reach.',
    sources: [
      { title: 'NIH: Iron', url: 'https://ods.od.nih.gov/factsheets/Iron-Consumer/' },
      { title: 'NHS: Ferrous fumarate', url: 'https://www.nhs.uk/medicines/ferrous-fumarate/' },
    ],
  },
  {
    id: 'magnesium', group: 'nutrition', title: 'Review a low magnesium result',
    eyebrow: 'GENERAL NUTRIENT EDUCATION', markerIds: ['magnesium'],
    summary: 'Low magnesium needs assessment of symptoms, medicines, losses and kidney function.',
    foods: ['Pumpkin seeds, in a portion suitable for your diet.', 'Beans or lentils.', 'Spinach or other leafy green vegetables.'],
    habits: ['Review digestive losses, alcohol use and medicines with a clinician. Palpitations, fainting, seizures or severe weakness require urgent care rather than a food plan.'],
    clinician: ['If a deficiency is confirmed and oral replacement is suitable, which preparation and follow-up tests are appropriate? Severe or symptomatic abnormalities may need supervised treatment.'],
    medications: [
      { name: 'Magnesium citrate', note: 'One oral supplement form to discuss if replacement is appropriate; it can cause diarrhoea.' },
      { name: 'Magnesium chloride', note: 'Another oral magnesium form. Choice depends on clinical context, tolerability and kidney function.' },
    ],
    caution: 'These are alternatives, not a combined regimen. Kidney disease increases the risk of magnesium accumulation; do not self-treat or delay assessment of symptoms.',
    sources: [{ title: 'NIH: Magnesium', url: 'https://ods.od.nih.gov/factsheets/Magnesium-Consumer/' }],
  },
  {
    id: 'calcium', group: 'kidney', title: 'Interpret calcium before replacing it',
    eyebrow: 'GENERAL NUTRIENT EDUCATION', markerIds: ['calcium'],
    summary: 'Low total calcium is not automatically dietary deficiency; albumin, ionized calcium and other factors can change interpretation.',
    foods: ['Milk or yogurt, where tolerated.', 'Calcium-fortified plant drinks; check the label.', 'Calcium-set tofu.'],
    habits: ['Ask about albumin, vitamin D, kidney function and relevant symptoms. Severe spasms, seizures, fainting or palpitations need urgent assessment.'],
    clinician: ['Is true hypocalcaemia confirmed, and what is its cause? Oral supplements are not appropriate for every low total-calcium result or for urgent symptomatic cases.'],
    medications: [
      { name: 'Calcium carbonate', note: 'An oral supplement option only if a clinician confirms a replacement need and checks interactions.' },
      { name: 'Calcium citrate', note: 'An alternative oral form; the choice depends on absorption, clinical context and other medicines.' },
    ],
    caution: 'Do not treat an albumin-related low total calcium as a proven dietary deficiency. A clinician should review kidney stones, kidney disease and interactions before supplementation.',
    sources: [{ title: 'NIH: Calcium', url: 'https://ods.od.nih.gov/factsheets/Calcium-Consumer/' }],
  },
]
