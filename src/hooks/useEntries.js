import { useCallback, useEffect, useState } from 'react'
import { deleteEntry, listEntries, syncPending } from '../lib/storage.js'
import { submitIntake, updateIntake } from '../lib/intake.js'
import { useLanguage } from '../i18n/LanguageContext.jsx'

// Symptom entries for the current user, plus submit/edit/delete.
//
//   const { entries, loading, notice, pendingCount, submit, edit, remove } = useEntries()
//   const result = await submit({ patientInput, inputMethod: 'text' | 'voice' })
//   const result = await edit(entry, { patientInput, inputMethod })
//
// Loads on mount, and re-syncs entries saved offline whenever the browser
// comes back online. Must be used inside <LanguageProvider>: the current UI
// language is passed along so non-English entries get an English copy.
//
// `notice` is a storage problem worth showing the user, as a code the UI turns
// into text (see the `notices.*` keys in src/i18n/locales/en.json):
//   'offlineList' | 'savedLocally' | 'deleteFailed' | null
export function useEntries() {
  const { language } = useLanguage()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState(null)

  const refresh = useCallback(async () => {
    await syncPending()
    const { entries: loaded, error } = await listEntries()
    setEntries(loaded)
    setNotice(error ? 'offlineList' : null)
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
    window.addEventListener('online', refresh)
    return () => window.removeEventListener('online', refresh)
  }, [refresh])

  const submit = useCallback(
    async (input) => {
      const result = await submitIntake({ language, ...input })
      setEntries((prev) => [result.entry, ...prev.filter((e) => e.id !== result.entry.id)])
      setNotice(result.saveError ? 'savedLocally' : null)
      return result
    },
    [language],
  )

  const edit = useCallback(
    async (entry, input) => {
      const result = await updateIntake(entry, { language, ...input })
      setEntries((prev) => prev.map((e) => (e.id === result.entry.id ? result.entry : e)))
      setNotice(result.saveError ? 'savedLocally' : null)
      return result
    },
    [language],
  )

  const remove = useCallback(async (id) => {
    setEntries((prev) => prev.filter((e) => e.id !== id))
    const { error } = await deleteEntry(id)
    if (error) setNotice('deleteFailed')
  }, [])

  const pendingCount = entries.filter((e) => !e.synced).length

  return { entries, loading, notice, pendingCount, submit, edit, remove, refresh }
}
