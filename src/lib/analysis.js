import { auth } from './firebase.js'

const RELEVANT_TERMS = new Set(
  `abdomen abdominal abscess acne allergy allergies anemia ankle ankles arm arms arthritis asthma back bladder bloating blood bowel brain breast breasts bronchitis burn burning calf cancer cardiac chest chills chronic constipation cramp cramps cramping cyst cysts diarrhea discharge dizziness dizzy dryness ear ears endometriosis fatigue fever fibroid fibroids fibromyalgia finger fingers flu foot feet fracture gallbladder gastritis genital glaucoma groin headache headaches heart heel hip hips infection inflammation injury insomnia intestine jaw joint kidney knee knees leg legs liver lung lungs lupus migraine migraines miscarriage mouth muscle muscular nausea neck nerve nipple numbness ovarian ovary ovulation pancreas pcos pelvic pelvis period periods pms rash rectal rectum reflux renal respiratory rib ribs shoulder shoulders sinus skin spine stomach stool swelling thyroid tonsil tooth teeth tremor ulcer urinary urine uti uterus uterine vaginal vagina vulva vulvar wrist wrists ache aches aching pain pains painful bleeding spotting itching itch numb tingling vomiting vomit weakness fainting faint dizzy discharge cramps hot flashes endometrial menstrual fibroid`.split(
    /\s+/,
  ),
)

export function wordsInEntry(entry) {
  const text = (entry.patient_input_en || entry.patient_input || '').toLocaleLowerCase()
  const words = text.match(/[\p{L}\p{N}]{3,}/gu) || []
  return new Set(words.filter((word) => RELEVANT_TERMS.has(word)))
}

export function findRecurringEntries(entries) {
  const entryWords = new Map()
  const counts = new Map()

  for (const entry of entries) {
    const words = wordsInEntry(entry)
    entryWords.set(entry.id, words)
    for (const word of words) counts.set(word, (counts.get(word) || 0) + 1)
  }

  const terms = [...counts]
    .filter(([, count]) => count >= 2)
    .map(([word, count]) => ({ word, count }))
    .sort((left, right) => right.count - left.count || left.word.localeCompare(right.word))
  const recurringWords = new Set(terms.map(({ word }) => word))
  const matchingEntries = entries.filter((entry) =>
    [...(entryWords.get(entry.id) || [])].some((word) => recurringWords.has(word)),
  )

  return { terms, matchingEntries, entryWords }
}

export async function generateEntrySummary(entries, language, focusTerms) {
  const headers = { 'Content-Type': 'application/json' }
  if (auth?.currentUser) {
    headers.Authorization = `Bearer ${await auth.currentUser.getIdToken()}`
  }

  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      language,
      focusTerms,
      entries: entries.map((entry) => ({
        date: entry.created_at,
        text: (entry.patient_input_en || entry.patient_input || '').trim(),
      })),
    }),
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || `Request failed: ${response.status}`)
  return body
}