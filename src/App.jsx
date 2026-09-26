import { useState } from 'react'
import { useEntries } from './hooks/useEntries.js'
import EntryList from './components/EntryList.jsx'

// Placeholder UI — replace with the real design.
// Submitting translates via POST /api/translate and saves the entry
// (Supabase, or localStorage when offline) — see src/lib/intake.js and
// src/hooks/useEntries.js.
export default function App() {
  const [patientInput, setPatientInput] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { entries, loading: entriesLoading, notice, submit, remove } = useEntries()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)
    const { translation, translateError } = await submit({ patientInput, inputMethod: 'text' })
    if (translateError) {
      setError(`${translateError.message} (your entry was still saved)`)
    } else {
      setResult(translation)
      setPatientInput('')
    }
    setLoading(false)
  }

  return (
    <div style={{ maxWidth: 600, margin: '2rem auto', padding: '0 1rem' }}>
      <h1>Women's Wellness — Translator (placeholder UI)</h1>
      <form onSubmit={handleSubmit}>
        <textarea
          value={patientInput}
          onChange={(e) => setPatientInput(e.target.value)}
          placeholder="Describe what you're experiencing..."
          rows={4}
          style={{ width: '100%', fontFamily: 'inherit', fontSize: '1rem' }}
        />
        <button type="submit" disabled={loading || !patientInput.trim()}>
          {loading ? 'Translating...' : 'Translate'}
        </button>
      </form>

      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      {result?.emergency && (
        <p style={{ color: 'crimson', fontWeight: 'bold' }}>
          This may need urgent care — see the message above from the API.
        </p>
      )}

      {result && (
        <pre style={{ background: '#f5f5f5', padding: '1rem', whiteSpace: 'pre-wrap' }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}

      <h2>Past entries</h2>
      {notice && <p style={{ color: '#b35c00' }}>{notice}</p>}
      <EntryList entries={entries} loading={entriesLoading} onDelete={remove} />
    </div>
  )
}
