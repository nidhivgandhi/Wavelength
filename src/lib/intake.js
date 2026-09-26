import { createEntry, saveEntry, translationFields } from './storage.js'

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

async function translateSafely(text) {
  try {
    return { translation: await translate(text), translateError: null }
  } catch (err) {
    return { translation: null, translateError: err }
  }
}

// One intake submission: translate, then save. Used by both typed and voice input.
//
// The entry is saved even if translation fails, so the patient's own words are
// never lost — it just has no translation fields.
//
// Returns { entry, translation, translateError, remote, saveError }.
export async function submitIntake({ patientInput, inputMethod = 'text' }) {
  const text = patientInput.trim()
  const { translation, translateError } = await translateSafely(text)
  const { entry, remote, error: saveError } = await saveEntry(
    createEntry({ patientInput: text, inputMethod, translation }),
  )
  return { entry, translation, translateError, remote, saveError }
}

// Edit an existing entry's text. Re-translates when the text changed (or the
// entry has no translation yet — passing the same text retries a failed one),
// so the clinical phrasing always matches the text. If translation fails the
// new text is still saved, with translation cleared rather than left stale.
// Keeps id and created_at; input_method becomes 'voice' if dictation was used.
//
// Returns { entry, translation, translateError, remote, saveError }.
export async function updateIntake(entry, { patientInput, inputMethod }) {
  const text = patientInput.trim()
  const needsTranslation = text !== entry.patient_input || !entry.clinical_phrasing

  let translation = null
  let translateError = null
  let translationUpdate = {}
  if (needsTranslation) {
    ;({ translation, translateError } = await translateSafely(text))
    translationUpdate = translationFields(translation)
  }

  const { entry: saved, remote, error: saveError } = await saveEntry({
    ...entry,
    patient_input: text,
    input_method: inputMethod === 'voice' ? 'voice' : entry.input_method,
    ...translationUpdate,
  })
  return { entry: saved, translation, translateError, remote, saveError }
}
