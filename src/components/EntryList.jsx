// Past symptom entries, newest first. Placeholder styling — swap for the real design.
export default function EntryList({ entries, loading, onDelete }) {
  if (loading) return <p>Loading past entries…</p>
  if (entries.length === 0) return <p style={{ color: '#666' }}>No entries yet.</p>

  return (
    <ul style={{ listStyle: 'none', padding: 0 }}>
      {entries.map((entry) => (
        <li
          key={entry.id}
          style={{ border: '1px solid #ddd', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '0.75rem' }}
        >
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: '#666' }}>
            <span>{new Date(entry.created_at).toLocaleString()}</span>
            <span>· {entry.input_method === 'voice' ? 'Spoken' : 'Typed'}</span>
            {entry.emergency && <span style={{ color: 'crimson', fontWeight: 'bold' }}>· Urgent</span>}
            {!entry.synced && <span>· Saved on this device only</span>}
            <button
              onClick={() => {
                if (window.confirm('Delete this entry?')) onDelete(entry.id)
              }}
              style={{ marginLeft: 'auto' }}
            >
              Delete
            </button>
          </div>

          <p style={{ margin: '0.5rem 0' }}>“{entry.patient_input}”</p>

          {entry.clinical_phrasing ? (
            <dl style={{ margin: 0, fontSize: 14 }}>
              <dt style={{ fontWeight: 'bold' }}>Clinical phrasing</dt>
              <dd style={{ margin: '0 0 0.5rem' }}>{entry.clinical_phrasing}</dd>
              {entry.why_it_matters && (
                <>
                  <dt style={{ fontWeight: 'bold' }}>Why it matters</dt>
                  <dd style={{ margin: '0 0 0.5rem' }}>{entry.why_it_matters}</dd>
                </>
              )}
              {entry.follow_up_question && (
                <>
                  <dt style={{ fontWeight: 'bold' }}>Follow-up question</dt>
                  <dd style={{ margin: 0 }}>{entry.follow_up_question}</dd>
                </>
              )}
            </dl>
          ) : (
            <p style={{ fontSize: 14, color: '#666', margin: 0 }}>Not translated.</p>
          )}
        </li>
      ))}
    </ul>
  )
}
