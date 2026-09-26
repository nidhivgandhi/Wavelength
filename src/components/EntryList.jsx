import { useState } from 'react'
import EntryForm from './EntryForm.jsx'

// Past symptom entries, newest first. Placeholder styling — swap for the real design.
//
// onEdit(entry, { patientInput, inputMethod }) — useEntries().edit.
export default function EntryList({ entries, loading, onEdit, onDelete }) {
  if (loading) return <p>Loading past entries…</p>
  if (entries.length === 0) return <p style={{ color: '#666' }}>No entries yet.</p>

  return (
    <ul style={{ listStyle: 'none', padding: 0 }}>
      {entries.map((entry) => (
        <EntryItem key={entry.id} entry={entry} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </ul>
  )
}

function EntryItem({ entry, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState(null)

  async function save(input) {
    setError(null)
    const { translateError } = await onEdit(entry, input)
    setEditing(false)
    if (translateError) setError(`Couldn't get clinical phrasing: ${translateError.message}. Your text was saved.`)
  }

  const small = { fontSize: 13, color: '#666' }

  return (
    <li style={{ border: '1px solid #ddd', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '0.75rem' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', ...small }}>
        <span>{new Date(entry.created_at).toLocaleString()}</span>
        <span>· {entry.input_method === 'voice' ? 'Spoken' : 'Typed'}</span>
        {entry.emergency && <span style={{ color: 'crimson', fontWeight: 'bold' }}>· Urgent</span>}
        {!entry.synced && <span>· Saved on this device only</span>}
        {!editing && (
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
            <button onClick={() => setEditing(true)}>Edit</button>
            <button
              onClick={() => {
                if (window.confirm('Delete this entry?')) onDelete(entry.id)
              }}
            >
              Delete
            </button>
          </span>
        )}
      </div>

      {editing ? (
        <div style={{ marginTop: '0.75rem' }}>
          <EntryForm
            initialText={entry.patient_input}
            onSubmit={save}
            onCancel={() => setEditing(false)}
            submitLabel="Save changes"
          />
        </div>
      ) : (
        <>
          <p style={{ margin: '0.5rem 0' }}>{entry.patient_input}</p>

          {error && <p style={{ color: 'crimson', fontSize: 14 }}>{error}</p>}

          {entry.clinical_phrasing && (
            <p style={{ margin: 0, fontSize: 14 }}>
              <strong>Clinical phrasing:</strong> {entry.clinical_phrasing}
            </p>
          )}
        </>
      )}
    </li>
  )
}
