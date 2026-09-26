import { useCallback, useEffect, useState } from 'react'
import { deleteEntry, listEntries, syncPending } from '../lib/storage.js'
import { submitIntake, updateIntake } from '../lib/intake.js'

// Symptom entries for the current user, plus submit/edit/delete.
//
//   const { entries, loading, notice, pendingCount, submit, edit, remove } = useEntries()
//   const result = await submit({ patientInput, inputMethod: 'text' | 'voice' })
//   const result = await edit(entry, { patientInput, inputMethod })
//
// Loads on mount, and re-syncs entries saved offline whenever the browser
// comes back online.
export function useEntries() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState(null) // storage problem worth showing the user

  const refresh = useCallback(async () => {
    await syncPending()
    const { entries: loaded, error } = await listEntries()
    setEntries(loaded)
    setNotice(error ? "Couldn't reach the server — showing entries saved on this device." : null)
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
    window.addEventListener('online', refresh)
    return () => window.removeEventListener('online', refresh)
  }, [refresh])

  const submit = useCallback(async (input) => {
    const result = await submitIntake(input)
    setEntries((prev) => [result.entry, ...prev.filter((e) => e.id !== result.entry.id)])
    setNotice(result.saveError ? 'Saved on this device only — it will sync when the connection is back.' : null)
    return result
  }, [])

  const edit = useCallback(async (entry, input) => {
    const result = await updateIntake(entry, input)
    setEntries((prev) => prev.map((e) => (e.id === result.entry.id ? result.entry : e)))
    setNotice(result.saveError ? 'Saved on this device only — it will sync when the connection is back.' : null)
    return result
  }, [])

  const remove = useCallback(async (id) => {
    setEntries((prev) => prev.filter((e) => e.id !== id))
    const { error } = await deleteEntry(id)
    if (error) setNotice("Couldn't delete from the server — the entry may reappear after a refresh.")
  }, [])

  const pendingCount = entries.filter((e) => !e.synced).length

  return { entries, loading, notice, pendingCount, submit, edit, remove, refresh }
}
