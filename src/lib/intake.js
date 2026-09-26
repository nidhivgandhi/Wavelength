import { createEntry, saveEntry, translationFields } from './storage.js'

async function postJson(url, payload) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || `Request failed: ${res.status}`)
  return body
}

// POST /api/translate -> { clinical_phrasing, why_it_matters, follow_up_question, emergency }
// Throws with the API's { error } message on a non-2xx response.
export function translate(patientInput) {
  return postJson('/api/translate', { patientInput })
}

// POST /api/translate-english -> { english_text, emergency }
export function translateToEnglish(text) {
  return postJson('/api/translate-english', { text })
}

async function translateSafely(text) {
  try {
    return { translation: await translate(text), translateError: null }
  } catch (err) {
    return { translation: null, translateError: err }
  }
}

async function englishSafely(text) {
  try {
    const { english_text, emergency } = await translateToEnglish(text)
    return { englishText: english_text || null, emergency: Boolean(emergency), englishError: null }
  } catch (err) {
    return { englishText: null, emergency: false, englishError: err }
  }
}

// One intake submission: translate, then save. Used by both typed and voice input.
// `language` is the UI language code; for anything but 'en' an English copy of
// the patient's words is saved too (patient_input_en).
//
// The entry is saved even if translation fails, so the patient's own words are
// never lost — it just has no translation fields.
//
// `emergency` is true if either /api/translate or /api/translate-english flagged
// it (the latter runs the English-only keyword check on the English copy).
//
// Returns { entry, translation, translateError, englishError, remote, saveError }.
export async function submitIntake({ patientInput, inputMethod = 'text', language = 'en' }) {
  const text = patientInput.trim()
  const [clinical, english] = await Promise.all([
    translateSafely(text),
    language !== 'en' ? englishSafely(text) : null,
  ])

  const entry = createEntry({
    patientInput: text,
    inputMethod,
    patientInputEn: english?.englishText ?? null,
    translation: clinical.translation,
  })
  entry.emergency = Boolean(clinical.translation?.emergency || english?.emergency)

  const { entry: saved, remote, error: saveError } = await saveEntry(entry)
  return {
    entry: saved,
    translation: clinical.translation,
    translateError: clinical.translateError,
    englishError: english?.englishError ?? null,
    remote,
    saveError,
  }
}

// Edit an existing entry's text. Re-translates when the text changed (or the
// entry has no translation yet — passing the same text retries a failed one),
// so the clinical phrasing always matches the text. If translation fails the
// new text is still saved, with translation cleared rather than left stale.
// The English copy is refreshed the same way (kept if the entry already had
// one, even when editing with the UI in English). Keeps id and created_at;
// input_method becomes 'voice' if dictation was used.
//
// Returns { entry, translation, translateError, englishError, remote, saveError }.
export async function updateIntake(entry, { patientInput, inputMethod, language = 'en' }) {
  const text = patientInput.trim()
  const textChanged = text !== entry.patient_input
  const wantEnglish = language !== 'en' || Boolean(entry.patient_input_en)
  const doClinical = textChanged || !entry.clinical_phrasing
  const doEnglish = wantEnglish && (textChanged || !entry.patient_input_en)

  const [clinical, english] = await Promise.all([
    doClinical ? translateSafely(text) : null,
    doEnglish ? englishSafely(text) : null,
  ])

  const update = {
    patient_input: text,
    input_method: inputMethod === 'voice' ? 'voice' : entry.input_method,
  }
  if (clinical) Object.assign(update, translationFields(clinical.translation))
  if (english) update.patient_input_en = english.englishText
  else if (textChanged) update.patient_input_en = null
  update.emergency = Boolean(
    (clinical ? clinical.translation?.emergency : entry.emergency) || english?.emergency,
  )

  const { entry: saved, remote, error: saveError } = await saveEntry({ ...entry, ...update })
  return {
    entry: saved,
    translation: clinical?.translation ?? null,
    translateError: clinical?.translateError ?? null,
    englishError: english?.englishError ?? null,
    remote,
    saveError,
  }
}
