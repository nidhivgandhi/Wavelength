import { useState } from 'react'

// Placeholder UI — replace with the real design.
// This wires up the locked /api/translate contract so it can be tested
// end-to-end from day one:
//
//   POST /api/translate
//   body: { patientInput: string }
//   ->    { clinical_phrasing, why_it_matters, follow_up_question, emergency }
//
// The endpoint currently returns stub data. See api/translate.js.
export default function App() {
  const [patientInput, setPatientInput] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientInput }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Request failed: ${res.status}`)
      }
      const data = await res.json()
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
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
    </div>
  )
}
