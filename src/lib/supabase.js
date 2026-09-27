import { createClient } from '@supabase/supabase-js'
import { auth, isFirebaseConfigured } from './firebase.js'

// The anon key is safe to ship to the browser — row-level security in
// supabase/schema.sql is what protects the data. Never put the service_role
// key in a VITE_ variable.
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// null when env vars are missing -> the app runs on localStorage only.
export const supabase = url && anonKey
  ? createClient(
      url,
      anonKey,
      isFirebaseConfigured()
        ? { accessToken: async () => auth.currentUser?.getIdToken() ?? null }
        : undefined,
    )
  : null

let sessionPromise = null

// Returns the current session, signing in anonymously if there isn't one.
// Concurrent callers share one in-flight sign-in.
export function ensureSession() {
  if (!supabase) return Promise.resolve(null)
  if (isFirebaseConfigured()) {
    const user = auth.currentUser
    if (!user) return Promise.reject(new Error('Sign in before accessing account storage.'))
    return user.getIdToken().then(() => ({ user: { id: user.uid } }))
  }
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const { data, error } = await supabase.auth.getSession()
      if (error) throw error
      if (data.session) return data.session

      const signIn = await supabase.auth.signInAnonymously()
      if (signIn.error) throw signIn.error
      return signIn.data.session
    })().catch((err) => {
      sessionPromise = null // allow a retry on the next call
      throw err
    })
  }
  return sessionPromise
}
