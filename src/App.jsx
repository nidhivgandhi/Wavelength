import { useState } from 'react'
import { useEntries } from './hooks/useEntries.js'
import { useLanguage } from './i18n/LanguageContext.jsx'
import EntryForm from './components/EntryForm.jsx'
import EntryList from './components/EntryList.jsx'
import LanguagePicker from './components/LanguagePicker.jsx'

// Placeholder UI — replace with the real design.
// All the logic lives outside this file, so a new page only needs:
//   useEntries()     (src/hooks/useEntries.js) — entries + submit/edit/remove
//   <EntryForm>      (src/components/EntryForm.jsx) — symptom text box + Complete log / Click to speak buttons
//   <EntryList>      (src/components/EntryList.jsx) — past entries, edit/delete
//   <LanguagePicker> (src/components/LanguagePicker.jsx) — UI + speech language
// and must be inside <LanguageProvider> (see main.jsx).
export default function App() {
  const { t } = useLanguage()
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const { entries, loading, notice, submit, edit, remove } = useEntries()

  async function handleSubmit(input) {
    setError(null)
    setResult(null)
    const { entry, translateError } = await submit(input)
    if (translateError) setError(t('phrasingFailed', { message: translateError.message }))
    setResult(entry)
  }

  return (
    <div style={{ maxWidth: 640, margin: '2rem auto', padding: '0 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h1>Wavelength (placeholder UI)</h1>
        <LanguagePicker />
      </div>

      <EntryForm onSubmit={handleSubmit} submitLabel={t('completeLog')} busyLabel={t('saving')} resetAfterSubmit />

      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      {result?.emergency && (
        <div role="alert" style={{ border: '2px solid crimson', borderRadius: 8, padding: '0.75rem 1rem', margin: '1rem 0' }}>
          <strong style={{ color: 'crimson' }}>{t('emergencyTitle')}</strong>
          <p style={{ margin: '0.5rem 0 0', fontWeight: 600 }}>{t('emergencyAction')}</p>
          {result.clinical_phrasing && (
            <p lang="en" style={{ margin: '0.5rem 0 0' }}>
              {result.clinical_phrasing}
            </p>
          )}
        </div>
      )}

      <h2>{t('pastEntries')}</h2>
      {notice && <p style={{ color: '#b35c00' }}>{t(`notices.${notice}`)}</p>}
      <EntryList entries={entries} loading={loading} onEdit={edit} onDelete={remove} />
    </div>
  )
}
