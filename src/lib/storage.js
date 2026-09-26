import { supabase, ensureSession } from './supabase.js'
import { auth, isFirebaseConfigured } from './firebase.js'

// Account-first storage with a local cache for offline recovery.
//
// Writes sync to the signed-in user's Supabase rows. Failed/offline writes stay
// cached with `synced: false` and are pushed by syncPending().
//
// Entry shape (matches the `symptoms` table and the /api/translate response):
//   { id, created_at, patient_input, input_method: 'text' | 'voice',
//     patient_input_en,   <- English copy for non-English entries (supabase/add_english_copy.sql)
//     clinical_phrasing, why_it_matters, follow_up_question, emergency,
//     user_id, synced }   <- synced is local-only

const LOCAL_KEY = 'wavelength.symptoms.v1'
const TABLE = 'symptoms'
const LEGACY_SUPABASE_USER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const REMOTE_COLUMNS = [
  'id',
  'user_id',
  'created_at',
  'patient_input',
  'input_method',
  'patient_input_en',
  'clinical_phrasing',
  'why_it_matters',
  'follow_up_question',
  'emergency',
]
const LEGACY_REMOTE_COLUMNS = REMOTE_COLUMNS.filter((column) => column !== 'patient_input_en')

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

function toRow(entry, userId = entry.user_id) {
  const row = {}
  for (const key of REMOTE_COLUMNS) row[key] = entry[key] ?? null
  row.user_id = userId
  row.emergency = Boolean(row.emergency)
  return row
}

async function upsertRows(entries, userId) {
  const rows = entries.map((entry) => toRow(entry, userId))
  let result = await supabase.from(TABLE).upsert(rows)
  if (isMissingEnglishCopyColumn(result.error)) {
    result = await supabase
      .from(TABLE)
      .upsert(rows.map(({ patient_input_en, ...row }) => row))
  }
  if (result.error) throw result.error
}

function byNewest(a, b) {
  return new Date(b.created_at) - new Date(a.created_at)
}

function isMissingEnglishCopyColumn(error) {
  return ['42703', 'PGRST204'].includes(error?.code) && error.message?.includes('patient_input_en')
}

function needsAccountMigration(entry) {
  return !entry.user_id || LEGACY_SUPABASE_USER_ID.test(entry.user_id)
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
  let local = { ...entry, synced: false }
  upsertLocal(local)

  if (!supabase) {
    return {
      entry: local,
      remote: false,
      error: isFirebaseConfigured() ? new Error('Account storage is not configured.') : undefined,
    }
  }

  try {
    const session = await ensureSession()
    const userId = session?.user?.id
    if (!userId) throw new Error('Could not determine the account that owns this entry.')
    local = { ...local, user_id: userId }
    upsertLocal(local)
    await upsertRows(local, userId)
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
  if (!supabase) {
    const entries = isFirebaseConfigured() ? local.filter((entry) => entry.user_id === auth.currentUser?.uid) : local
    return {
      entries: entries.sort(byNewest),
      remote: false,
      unownedLocalCount: local.filter(needsAccountMigration).length,
    }
  }

  let userId = null
  try {
    const session = await ensureSession()
    userId = session?.user?.id
    if (!userId) throw new Error('Could not determine the signed-in account.')
    let result = await supabase
      .from(TABLE)
      .select(REMOTE_COLUMNS.join(','))
      .order('created_at', { ascending: false })
    if (isMissingEnglishCopyColumn(result.error)) {
      result = await supabase
        .from(TABLE)
        .select(LEGACY_REMOTE_COLUMNS.join(','))
        .order('created_at', { ascending: false })
    }
    const { data, error } = result
    if (error) throw error

    const remoteIds = new Set(data.map((row) => row.id))
    const pending = local.filter((entry) =>
      entry.user_id === userId && !entry.synced && !remoteIds.has(entry.id),
    )
    const merged = [...data.map((row) => ({ ...row, synced: true })), ...pending].sort(byNewest)
    writeLocal([...merged, ...local.filter(needsAccountMigration)])
    return {
      entries: merged,
      remote: true,
      unownedLocalCount: local.filter(needsAccountMigration).length,
    }
  } catch (error) {
    console.warn('[storage] Supabase read failed, using local cache', error)
    const cached = isFirebaseConfigured()
      ? local.filter((entry) => entry.user_id === (userId || auth.currentUser?.uid))
      : local
    return {
      entries: cached.sort(byNewest),
      remote: false,
      error,
      unownedLocalCount: local.filter(needsAccountMigration).length,
    }
  }
}

// Delete by id. Returns { remote, error? }.
export async function deleteEntry(id) {
  if (!supabase) {
    writeLocal(readLocal().filter((entry) => entry.id !== id))
    return { remote: false }
  }

  try {
    await ensureSession()
    const { error } = await supabase.from(TABLE).delete().eq('id', id)
    if (error) throw error
    writeLocal(readLocal().filter((entry) => entry.id !== id))
    return { remote: true }
  } catch (error) {
    console.warn('[storage] Supabase delete failed', error)
    return { remote: false, error }
  }
}

// Push entries saved while offline. Returns { synced: number, error? }.
// Call on app load and on the window 'online' event.
export async function syncPending() {
  if (!supabase) return { synced: 0 }

  try {
    const session = await ensureSession()
    const userId = session?.user?.id
    if (!userId) throw new Error('Could not determine the signed-in account.')
    const pending = readLocal().filter((entry) => !entry.synced && entry.user_id === userId)
    if (pending.length === 0) return { synced: 0 }
    await upsertRows(pending, userId)
    const ids = new Set(pending.map((e) => e.id))
    writeLocal(readLocal().map((e) => (ids.has(e.id) ? { ...e, synced: true } : e)))
    return { synced: pending.length }
  } catch (error) {
    console.warn('[storage] sync failed', error)
    return { synced: 0, error }
  }
}

export async function migrateLocalEntriesToAccount() {
  if (!supabase) return { migrated: 0, error: new Error('Account storage is not configured.') }

  const local = readLocal()
  const unowned = local.filter(needsAccountMigration)
  if (unowned.length === 0) return { migrated: 0 }

  try {
    const session = await ensureSession()
    const userId = session?.user?.id
    if (!userId) throw new Error('Could not determine the signed-in account.')
    const migrated = unowned.map((entry) => ({
      ...entry,
      id: crypto.randomUUID(),
      user_id: userId,
      synced: false,
    }))
    await upsertRows(migrated, userId)
    const migratedIds = new Set(unowned.map((entry) => entry.id))
    writeLocal([
      ...local.filter((entry) => !migratedIds.has(entry.id)),
      ...migrated.map((entry) => ({ ...entry, synced: true })),
    ])
    return { migrated: migrated.length }
  } catch (error) {
    return { migrated: 0, error }
  }
}
