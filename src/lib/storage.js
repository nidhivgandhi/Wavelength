import { supabase, ensureSession } from './supabase.js'

// Local-first storage for symptom entries.
//
// Every write goes to localStorage first, then to Supabase if it's configured
// and reachable. Entries that didn't make it up are marked `synced: false` and
// pushed by syncPending(). With no Supabase env vars the app is localStorage-only.
//
// Entry shape (matches the `symptoms` table and the /api/translate response):
//   { id, created_at, patient_input, input_method: 'text' | 'voice',
//     patient_input_en,   <- English copy for non-English entries (supabase/add_english_copy.sql)
//     clinical_phrasing, why_it_matters, follow_up_question, emergency,
//     synced }   <- `synced` is local-only, never sent to Supabase

const LOCAL_KEY = 'wavelength.symptoms.v1'
const TABLE = 'symptoms'

const REMOTE_COLUMNS = [
  'id',
  'created_at',
  'patient_input',
  'input_method',
  'patient_input_en',
  'clinical_phrasing',
  'why_it_matters',
  'follow_up_question',
  'emergency',
]

export const isRemoteEnabled = Boolean(supabase)

// ---- Building entries ------------------------------------------------------

// The entry fields that come from an /api/translate response (all cleared when
// translation is null).
export function translationFields(translation) {
  return {
    clinical_phrasing: translation?.clinical_phrasing ?? null,
    why_it_matters: translation?.why_it_matters ?? null,
    follow_up_question: translation?.follow_up_question ?? null,
    emergency: Boolean(translation?.emergency),
  }
}

export function createEntry({ patientInput, inputMethod = 'text', patientInputEn = null, translation = null }) {
  return {
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    patient_input: patientInput,
    input_method: inputMethod,
    patient_input_en: patientInputEn,
    ...translationFields(translation),
    synced: false,
  }
}

function toRow(entry) {
  const row = {}
  for (const key of REMOTE_COLUMNS) row[key] = entry[key] ?? null
  row.emergency = Boolean(row.emergency)
  return row
}

function byNewest(a, b) {
  return new Date(b.created_at) - new Date(a.created_at)
}

// ---- localStorage ----------------------------------------------------------

function readLocal() {
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return [] // blocked storage (private mode) or corrupt JSON
  }
}

function writeLocal(entries) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(entries))
  } catch (err) {
    console.warn('[storage] localStorage write failed', err)
  }
}

function upsertLocal(entry) {
  const entries = readLocal().filter((e) => e.id !== entry.id)
  entries.push(entry)
  writeLocal(entries.sort(byNewest))
}

// ---- Public API ------------------------------------------------------------
// Each call resolves (never rejects for network/auth problems) so the UI can
// keep working offline. `remote` says whether Supabase was actually used.

// Save a new or edited entry. Returns { entry, remote, error? }.
export async function saveEntry(entry) {
  const local = { ...entry, synced: false }
  upsertLocal(local)

  if (!supabase) return { entry: local, remote: false }

  try {
    await ensureSession()
    const { error } = await supabase.from(TABLE).upsert(toRow(local))
    if (error) throw error
    const synced = { ...local, synced: true }
    upsertLocal(synced)
    return { entry: synced, remote: true }
  } catch (error) {
    console.warn('[storage] Supabase save failed, kept locally', error)
    return { entry: local, remote: false, error }
  }
}

// All entries, newest first. Returns { entries, remote, error? }.
// Remote rows replace the local cache; unsynced local entries are kept on top.
export async function listEntries() {
  const local = readLocal()
  if (!supabase) return { entries: local.sort(byNewest), remote: false }

  try {
    await ensureSession()
    const { data, error } = await supabase
      .from(TABLE)
      .select(REMOTE_COLUMNS.join(','))
      .order('created_at', { ascending: false })
    if (error) throw error

    const remoteIds = new Set(data.map((row) => row.id))
    const pending = local.filter((e) => !e.synced && !remoteIds.has(e.id))
    const merged = [...data.map((row) => ({ ...row, synced: true })), ...pending].sort(byNewest)
    writeLocal(merged)
    return { entries: merged, remote: true }
  } catch (error) {
    console.warn('[storage] Supabase read failed, using local cache', error)
    return { entries: local.sort(byNewest), remote: false, error }
  }
}

// Delete by id. Returns { remote, error? }.
export async function deleteEntry(id) {
  writeLocal(readLocal().filter((e) => e.id !== id))
  if (!supabase) return { remote: false }

  try {
    await ensureSession()
    const { error } = await supabase.from(TABLE).delete().eq('id', id)
    if (error) throw error
    return { remote: true }
  } catch (error) {
    console.warn('[storage] Supabase delete failed', error)
    return { remote: false, error }
  }
}

// Push entries saved while offline. Returns { synced: number, error? }.
// Call on app load and on the window 'online' event.
export async function syncPending() {
  const pending = readLocal().filter((e) => !e.synced)
  if (!supabase || pending.length === 0) return { synced: 0 }

  try {
    await ensureSession()
    const { error } = await supabase.from(TABLE).upsert(pending.map(toRow))
    if (error) throw error
    const ids = new Set(pending.map((e) => e.id))
    writeLocal(readLocal().map((e) => (ids.has(e.id) ? { ...e, synced: true } : e)))
    return { synced: pending.length }
  } catch (error) {
    console.warn('[storage] sync failed', error)
    return { synced: 0, error }
  }
}
