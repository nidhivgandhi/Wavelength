import { createEntry, saveEntry } from './storage.js'

// POST /api/translate -> { clinical_phrasing, why_it_matters, follow_up_question, emergency }
// Throws with the API's { error } message on a non-2xx response.
export async function translate(patientInput) {
  const res = await fetch('/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patientInput }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || `Request failed: ${res.status}`)
  return body
}

// One intake submission: translate, then save. Used by both typed and voice input.
//
// The entry is saved even if translation fails, so the patient's own words are
// never lost — it just has no translation fields.
//
// Returns { entry, translation, translateError, remote, saveError }.
export async function submitIntake({ patientInput, inputMethod = 'text' }) {
  const text = patientInput.trim()

  let translation = null
  let translateError = null
  try {
    translation = await translate(text)
  } catch (err) {
    translateError = err
  }

  const { entry, remote, error: saveError } = await saveEntry(
    createEntry({ patientInput: text, inputMethod, translation }),
  )
  return { entry, translation, translateError, remote, saveError }
}
