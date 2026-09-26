import { getApp, getApps, initializeApp } from 'firebase/app'
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  browserSessionPersistence,
  getAuth,
  onAuthStateChanged,
  setPersistence,
} from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

const requiredConfigKeys = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId',
]

export const missingFirebaseConfig = requiredConfigKeys.filter((key) => !firebaseConfig[key])

export function isFirebaseConfigured() {
  return missingFirebaseConfig.length === 0
}

const app = isFirebaseConfigured()
  ? getApps().length > 0
    ? getApp()
    : initializeApp(firebaseConfig)
  : null

export const auth = app ? getAuth(app) : null
export const googleProvider = app ? new GoogleAuthProvider() : null

if (googleProvider) {
  googleProvider.setCustomParameters({
    prompt: 'select_account',
  })
}

let authReadyPromise = Promise.resolve(null)

if (auth) {
  authReadyPromise = new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        unsubscribe()
        resolve(user)
      },
      () => {
        unsubscribe()
        resolve(null)
      },
    )
  })
}

export function currentUid() {
  return auth?.currentUser?.uid ?? null
}

export async function setAuthPersistence(keepSignedIn) {
  if (!auth) {
    throw new Error('Firebase is not configured.')
  }

  await setPersistence(auth, keepSignedIn ? browserLocalPersistence : browserSessionPersistence)
}

export async function waitForAuthReady() {
  return authReadyPromise
}

export async function authedFetch(url, options = {}) {
  if (!auth) {
    throw new Error('Firebase is not configured.')
  }

  const user = auth.currentUser || (await waitForAuthReady())
  if (!user) {
    throw new Error('User is not signed in.')
  }

  const token = await user.getIdToken()
  const headers = new Headers(options.headers || {})
  headers.set('Authorization', `Bearer ${token}`)

  return fetch(url, {
    ...options,
    headers,
  })
}
