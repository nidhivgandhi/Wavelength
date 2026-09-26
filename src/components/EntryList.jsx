import { useEffect, useState } from 'react'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import EntryForm from './EntryForm.jsx'

const CONFIRM_TIMEOUT_MS = 4000

// Two-click delete: the first click asks for a second click; if none comes
// within a few seconds (or focus leaves the button), it resets to "Delete".
function DeleteButton({ onDelete }) {
  const { t } = useLanguage()
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    if (!confirming) return
    const timer = setTimeout(() => setConfirming(false), CONFIRM_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [confirming])

  return (
    <button
      onClick={() => (confirming ? onDelete() : setConfirming(true))}
      onBlur={() => setConfirming(false)}
      style={confirming ? { color: 'white', background: 'crimson', borderColor: 'crimson' } : undefined}
    >
      {confirming ? t('confirmDelete') : t('delete')}
    </button>
  )
}

// Past symptom entries, newest first. Placeholder styling — swap for the real design.
//
// onEdit(entry, { patientInput, inputMethod }) — useEntries().edit.
export default function EntryList({ entries, loading, onEdit, onDelete }) {
  const { t } = useLanguage()
  if (loading) return <p>{t('loadingEntries')}</p>
  if (entries.length === 0) return <p style={{ color: '#666' }}>{t('noEntries')}</p>

  return (
    <ul style={{ listStyle: 'none', padding: 0 }}>
      {entries.map((entry) => (
        <EntryItem key={entry.id} entry={entry} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </ul>
  )
}

// /api/translate answers too-vague input with a "more detail needed" phrasing
// (systemPrompt.js rule 4) instead of a real one. There's no flag for it in the
// response, so this matches the wording — update if the prompt changes.
function isLowDetail(entry) {
  return /insufficient (detail|information)|more detail/i.test(entry.clinical_phrasing || '')
}

function EntryItem({ entry, onEdit, onDelete }) {
  const { t, locale, language } = useLanguage()
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState(null)

  async function save(input) {
    setError(null)
    const { translateError } = await onEdit(entry, input)
    setEditing(false)
    if (translateError) setError(t('phrasingFailed', { message: translateError.message }))
  }

  const small = { fontSize: 13, color: '#666' }

  return (
    <li style={{ border: '1px solid #ddd', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '0.75rem' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', ...small }}>
        <span>{new Date(entry.created_at).toLocaleString(locale)}</span>
        <span>· {entry.input_method === 'voice' ? t('spoken') : t('typed')}</span>
        {entry.emergency && <span style={{ color: 'crimson', fontWeight: 'bold' }}>· {t('urgent')}</span>}
        {!entry.synced && <span>· {t('deviceOnly')}</span>}
        {!editing && (
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
            <button onClick={() => setEditing(true)}>{t('edit')}</button>
            <DeleteButton onDelete={() => onDelete(entry.id)} />
          </span>
        )}
      </div>

      {editing ? (
        <div style={{ marginTop: '0.75rem' }}>
          <EntryForm
            initialText={entry.patient_input}
            onSubmit={save}
            onCancel={() => setEditing(false)}
          />
        </div>
      ) : (
        <>
          <p style={{ margin: '0.5rem 0' }}>{entry.patient_input}</p>
          {entry.patient_input_en && entry.patient_input_en.trim() !== entry.patient_input.trim() && (
            <p style={{ margin: '0 0 0.5rem', fontSize: 14 }}>
              <span style={{ color: '#666' }}>{t('inEnglish')}:</span> <span lang="en">{entry.patient_input_en}</span>
            </p>
          )}

          {error && <p style={{ color: 'crimson', fontSize: 14 }}>{error}</p>}

          {entry.clinical_phrasing && (
            <p style={{ margin: 0, fontSize: 14 }}>
              <strong>{t('clinicalPhrasing')}:</strong> <span lang="en">{entry.clinical_phrasing}</span>
            </p>
          )}

          {isLowDetail(entry) && (
            <p style={{ margin: '0.5rem 0 0', fontSize: 14, color: '#b35c00' }}>
              {language === 'en' && entry.follow_up_question
                ? t('lowDetailQuestion', { question: entry.follow_up_question })
                : t('lowDetailHint')}
            </p>
          )}
        </>
      )}
    </li>
  )
}
