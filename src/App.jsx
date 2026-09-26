import { useState } from 'react'
import { useEntries } from './hooks/useEntries.js'
import EntryForm from './components/EntryForm.jsx'
import EntryList from './components/EntryList.jsx'

// Placeholder UI — replace with the real design.
// All the logic lives outside this file, so a new page only needs:
//   useEntries()  (src/hooks/useEntries.js) — entries + submit/edit/remove
//   <EntryForm>   (src/components/EntryForm.jsx) — symptom text box + Complete log / Click to speak buttons
//   <EntryList>   (src/components/EntryList.jsx) — past entries, edit/delete
export default function App() {
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const { entries, loading, notice, submit, edit, remove } = useEntries()

  async function handleSubmit(input) {
    setError(null)
    setResult(null)
    const { translation, translateError } = await submit(input)
    if (translateError) setError(`Couldn't get clinical phrasing: ${translateError.message} (your entry was still saved)`)
    else setResult(translation)
  }

  return (
    <div style={{ maxWidth: 640, margin: '2rem auto', padding: '0 1rem' }}>
      <h1>Wavelength (placeholder UI)</h1>

      <EntryForm onSubmit={handleSubmit} submitLabel="Complete log" busyLabel="Saving…" resetAfterSubmit />

      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      {result?.emergency && (
        <div role="alert" style={{ border: '2px solid crimson', borderRadius: 8, padding: '0.75rem 1rem', margin: '1rem 0' }}>
          <strong style={{ color: 'crimson' }}>This may need urgent care.</strong>
          <p style={{ margin: '0.5rem 0 0' }}>{result.clinical_phrasing}</p>
        </div>
      )}

      <h2>Past entries</h2>
      {notice && <p style={{ color: '#b35c00' }}>{notice}</p>}
      <EntryList entries={entries} loading={loading} onEdit={edit} onDelete={remove} />
    </div>
  )
}
