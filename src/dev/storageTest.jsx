import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import { ensureSession } from '../lib/supabase.js'
import { createEntry, saveEntry, listEntries, syncPending, isRemoteEnabled } from '../lib/storage.js'

// Dev-only page for checking the Supabase + localStorage wiring.
// Open http://localhost:5173/test.html while `npm run dev` is running.
function StorageTest() {
  const [log, setLog] = useState([])

  function append(label, value) {
    const text = value instanceof Error ? `ERROR: ${value.message}` : JSON.stringify(value, null, 2)
    setLog((prev) => [`▸ ${label}\n${text}`, ...prev])
  }

  async function run(label, fn) {
    try {
      append(label, await fn())
    } catch (err) {
      append(label, err)
    }
  }

  const checkSession = () =>
    run('Sign in', async () => {
      const session = await ensureSession()
      return session ? { signedIn: true, userId: session.user.id } : { signedIn: false, reason: 'Supabase not configured' }
    })

  const saveTest = () =>
    run('Save test entry', async () => {
      const entry = createEntry({
        patientInput: `Test entry from storage test page (${new Date().toLocaleTimeString()})`,
        translation: {
          clinical_phrasing: 'Test clinical phrasing',
          why_it_matters: 'Test why it matters',
          follow_up_question: 'Test follow-up question',
          emergency: false,
        },
      })
      const { remote, error } = await saveEntry(entry)
      return { savedToSupabase: remote, error: error?.message, id: entry.id }
    })

  const list = () =>
    run('List entries', async () => {
      const { entries, remote, error } = await listEntries()
      return { fromSupabase: remote, error: error?.message, count: entries.length, entries }
    })

  const sync = () =>
    run('Sync pending', async () => {
      const { synced, error } = await syncPending()
      return { synced, error: error?.message }
    })

  return (
    <div style={{ maxWidth: 700, margin: '2rem auto', padding: '0 1rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Storage test</h1>
      <p>
        Supabase configured:{' '}
        <strong style={{ color: isRemoteEnabled ? 'green' : 'crimson' }}>
          {isRemoteEnabled ? 'yes' : 'no — check .env and restart npm run dev'}
        </strong>
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={checkSession}>1. Sign in</button>
        <button onClick={saveTest}>2. Save test entry</button>
        <button onClick={list}>3. List entries</button>
        <button onClick={sync}>Sync pending</button>
        <button onClick={() => setLog([])}>Clear log</button>
      </div>
      {log.map((line, i) => (
        <pre key={i} style={{ background: '#f5f5f5', padding: '0.75rem', whiteSpace: 'pre-wrap', fontSize: 13 }}>
          {line}
        </pre>
      ))}
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(<StorageTest />)
