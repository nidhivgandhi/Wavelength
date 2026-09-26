import { useEffect, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth'
import EntryForm from './components/EntryForm.jsx'
import EntryList from './components/EntryList.jsx'
import AnalysisView from './components/AnalysisView.jsx'
import LanguagePicker from './components/LanguagePicker.jsx'
import { useEntries } from './hooks/useEntries.js'
import { useLanguage } from './i18n/LanguageContext.jsx'
import {
  auth,
  googleProvider,
  isFirebaseConfigured,
  missingFirebaseConfig,
  setAuthPersistence,
} from './lib/firebase.js'

// Sign-in is opt-in: it only gates the app once a real Firebase project is
// configured (see src/lib/firebase.js / README "Firebase auth" section). With
// no Firebase env vars set, isFirebaseConfigured() is false and App() skips
// straight to AuthedApp with no user — same open-access behavior as before
// this was added. Set the VITE_FIREBASE_* env vars and it activates itself,
// no other code changes needed. api/lib/firebaseAdmin.js mirrors this on the
// server: /api/translate only requires a token when FIREBASE_PROJECT_ID is set.

const AUTH_USER_STORAGE_KEY = 'wavelength.authUser.v1'

const authErrorMessages = {
  'auth/account-exists-with-different-credential':
    'An account already exists for this email with a different sign-in method.',
  'auth/app-not-authorized':
    'This app is not authorized for Firebase Auth. Check the Firebase web app config and authorized domains.',
  'auth/configuration-not-found':
    'Firebase Auth is not enabled for this project. Enable Authentication in Firebase Console.',
  'auth/email-already-in-use': 'An account already exists for that email. Try signing in instead.',
  'auth/invalid-api-key': 'The Firebase API key is invalid. Check your environment variables.',
  'auth/invalid-credential': 'The email or password is incorrect.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/network-request-failed': 'Network request failed. Check your connection and try again.',
  'auth/operation-not-allowed':
    'That sign-in method is disabled in Firebase Console. Enable Google and Email/Password providers.',
  'auth/popup-blocked': 'Your browser blocked the Google sign-in popup. Allow popups and try again.',
  'auth/popup-closed-by-user': 'Google sign-in was closed before it finished.',
  'auth/cancelled-popup-request': 'Another Google sign-in popup is already open.',
  'auth/too-many-requests': 'Too many attempts. Wait a moment, then try again.',
  'auth/unauthorized-domain':
    'This domain is not authorized in Firebase. Add localhost and your deployed domain in Firebase Authentication settings.',
  'auth/user-not-found': 'No account was found for that email.',
  'auth/wrong-password': 'The password is incorrect.',
}

function friendlyAuthError(error) {
  return authErrorMessages[error?.code] || error?.message || 'Authentication failed. Try again.'
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function Toast({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return undefined
    const timeout = window.setTimeout(onDismiss, 4200)
    return () => window.clearTimeout(timeout)
  }, [onDismiss, toast])

  if (!toast) return null

  return (
    <div className={`toast ${toast.type || 'info'}`} role="status">
      <span>{toast.message}</span>
      <button aria-label="Dismiss message" onClick={onDismiss} type="button">
        x
      </button>
    </div>
  )
}

function FloatingInput({ autoComplete, disabled, error, id, label, onChange, type = 'text', value }) {
  return (
    <label className={error ? 'floating-field invalid' : 'floating-field'} htmlFor={id}>
      <input
        autoComplete={autoComplete}
        disabled={disabled}
        id={id}
        onChange={onChange}
        placeholder=" "
        type={type}
        value={value}
      />
      <span>{label}</span>
    </label>
  )
}

function AuthPage({ toast, onToast, onToastDismiss }) {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [keepSignedIn, setKeepSignedIn] = useState(true)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [loadingAction, setLoadingAction] = useState(null)

  const isSignup = mode === 'signup'
  const loading = Boolean(loadingAction)
  const configured = isFirebaseConfigured()

  useEffect(() => {
    if (!configured) return

    setAuthPersistence(keepSignedIn).catch((error) => {
      onToast({ type: 'error', message: friendlyAuthError(error) })
    })
  }, [configured, keepSignedIn, onToast])

  function resetForMode(nextMode) {
    setMode(nextMode)
    setFieldErrors({})
  }

  function validateCredentials({ requirePassword = true } = {}) {
    const nextErrors = {}
    if (!isValidEmail(email.trim())) nextErrors.email = true
    if (requirePassword && password.length < 6) nextErrors.password = true

    setFieldErrors(nextErrors)

    if (nextErrors.email) {
      onToast({ type: 'error', message: 'Enter a valid email address.' })
      return false
    }
    if (nextErrors.password) {
      onToast({ type: 'error', message: 'Password must be at least 6 characters.' })
      return false
    }
    return true
  }

  async function submitAuth(event) {
    event.preventDefault()
    if (!configured) {
      onToast({ type: 'error', message: 'Firebase is not configured yet.' })
      return
    }
    if (!validateCredentials()) return
    if (isSignup && !acceptedTerms) {
      onToast({ type: 'error', message: 'Agree to the terms and privacy notice before continuing.' })
      return
    }

    setLoadingAction(isSignup ? 'signup' : 'signin')
    try {
      await setAuthPersistence(keepSignedIn)
      if (isSignup) {
        await createUserWithEmailAndPassword(auth, email.trim(), password)
        onToast({ type: 'success', message: 'Account created. Welcome to Wavelength.' })
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password)
        onToast({ type: 'success', message: 'Signed in.' })
      }
    } catch (error) {
      onToast({ type: 'error', message: friendlyAuthError(error) })
    } finally {
      setLoadingAction(null)
    }
  }

  async function submitGoogle() {
    if (!configured) {
      onToast({ type: 'error', message: 'Firebase is not configured yet.' })
      return
    }

    setLoadingAction('google')
    try {
      await signInWithPopup(auth, googleProvider)
      onToast({ type: 'success', message: 'Signed in with Google.' })
    } catch (error) {
      onToast({ type: 'error', message: friendlyAuthError(error) })
    } finally {
      setLoadingAction(null)
    }
  }

  async function resetPassword() {
    if (!configured) {
      onToast({ type: 'error', message: 'Firebase is not configured yet.' })
      return
    }
    if (!validateCredentials({ requirePassword: false })) return

    setLoadingAction('reset')
    try {
      await sendPasswordResetEmail(auth, email.trim())
      onToast({ type: 'success', message: 'Password reset email sent.' })
    } catch (error) {
      onToast({ type: 'error', message: friendlyAuthError(error) })
    } finally {
      setLoadingAction(null)
    }
  }

  return (
    <main className="auth-shell">
      <Toast toast={toast} onDismiss={onToastDismiss} />
      <section className="auth-stage">
        <aside className="auth-visual" aria-hidden="true">
          <div>
            <p className="eyebrow">Wavelength</p>
            <h1>Track symptoms with context, not guesswork.</h1>
            <p>Build a clean timeline, surface patterns, and bring a clearer visit brief into the room.</p>
          </div>
          <div className="product-preview">
            <div className="preview-topline">
              <span>Today</span>
              <strong>Symptom pattern</strong>
            </div>
            <div className="preview-chart">
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
            <div className="preview-summary">
              <span />
              <span />
              <span />
            </div>
          </div>
        </aside>

        <section className="auth-panel">
          <div>
            <p className="eyebrow">Secure access</p>
            <h1>{isSignup ? 'Create your account' : 'Welcome back'}</h1>
            <p className="lede">
              {isSignup
                ? 'Start a private symptom history with email, password, or Google.'
                : 'Sign in to continue to your dashboard.'}
            </p>
          </div>

          {!configured && (
            <div className="setup-error">
              <strong>Firebase setup required</strong>
              <span>
                Add the Vite Firebase environment variables, then restart the dev server. Missing:{' '}
                {missingFirebaseConfig.join(', ')}.
              </span>
            </div>
          )}

          <button className="google-action" disabled={loading || !configured} onClick={submitGoogle} type="button">
            <span>G</span>
            {loadingAction === 'google' ? 'Opening Google...' : 'Continue with Google'}
          </button>

          <div className="auth-divider">
            <span>or</span>
          </div>

          <form className="form-stack" onSubmit={submitAuth}>
            <FloatingInput
              autoComplete="email"
              disabled={loading}
              error={fieldErrors.email}
              id="email"
              label="Email"
              onChange={(event) => {
                setEmail(event.target.value)
                setFieldErrors((current) => ({ ...current, email: false }))
              }}
              type="email"
              value={email}
            />

            <div className="password-row">
              <button className="text-action" disabled={loading || !configured} onClick={resetPassword} type="button">
                {loadingAction === 'reset' ? 'Sending...' : 'Forgot password?'}
              </button>
            </div>

            <FloatingInput
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              disabled={loading}
              error={fieldErrors.password}
              id="password"
              label={isSignup ? 'Create a password' : 'Password'}
              onChange={(event) => {
                setPassword(event.target.value)
                setFieldErrors((current) => ({ ...current, password: false }))
              }}
              type="password"
              value={password}
            />

            <label className="check-row">
              <input
                checked={keepSignedIn}
                disabled={loading}
                onChange={(event) => setKeepSignedIn(event.target.checked)}
                type="checkbox"
              />
              <span>Keep me signed in</span>
            </label>

            {isSignup && (
              <label className="check-row">
                <input
                  checked={acceptedTerms}
                  disabled={loading}
                  onChange={(event) => setAcceptedTerms(event.target.checked)}
                  type="checkbox"
                />
                <span>I agree to the terms and privacy notice.</span>
              </label>
            )}

            <button className="primary-action" disabled={loading || !configured} type="submit">
              {loadingAction === 'signin' && 'Signing in...'}
              {loadingAction === 'signup' && 'Creating account...'}
              {!loadingAction && (isSignup ? 'Create account' : 'Sign in')}
            </button>
          </form>

          <p className="auth-switch-copy">
            {isSignup ? 'Already have an account?' : 'New to Wavelength?'}{' '}
            <button disabled={loading} onClick={() => resetForMode(isSignup ? 'signin' : 'signup')} type="button">
              {isSignup ? 'Sign in' : 'Create an account'}
            </button>
          </p>
        </section>
      </section>
    </main>
  )
}

// `onSignOut` and `user` are both null when Firebase isn't configured — the
// header just omits the identity line and the sign-out button in that case.
function AuthedApp({ onSignOut, toast, onToastDismiss, user }) {
  const { t } = useLanguage()
  const [activeView, setActiveView] = useState('log')
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const { entries, loading, notice, submit, edit, remove } = useEntries()

  async function handleSubmit(input) {
    setError(null)
    setResult(null)
    const { entry, translateError } = await submit(input)
    if (translateError) setError(t('phrasingFailed', { message: translateError.message }))
    setResult(entry)
  }

  return (
    <main className="app-page">
      <Toast toast={toast} onDismiss={onToastDismiss} />
      <header className="app-header">
        <div>
          <p className="eyebrow">Wavelength</p>
          <h1>{activeView === 'analysis' ? t('analysisTitle') : t('symptomLog')}</h1>
          {user && <p>Signed in as {user.email || user.displayName || user.uid}</p>}
        </div>
        <div className="app-header-controls">
          <nav className="view-switch" aria-label={t('mainNavigation')}>
            <button
              aria-pressed={activeView === 'log'}
              className={activeView === 'log' ? 'active' : ''}
              onClick={() => setActiveView('log')}
              type="button"
            >
              {t('symptomLog')}
            </button>
            <button
              aria-pressed={activeView === 'analysis'}
              className={activeView === 'analysis' ? 'active' : ''}
              onClick={() => setActiveView('analysis')}
              type="button"
            >
              {t('analysis')}
            </button>
          </nav>
          <LanguagePicker />
          {onSignOut && (
            <button className="secondary-action" onClick={onSignOut} type="button">
              Sign out
            </button>
          )}
        </div>
      </header>

      {activeView === 'analysis' ? (
        <AnalysisView entries={entries} loading={loading} />
      ) : (
        <>
          <section className="entry-panel">
            <EntryForm onSubmit={handleSubmit} submitLabel={t('completeLog')} busyLabel={t('saving')} resetAfterSubmit />

            {error && <p className="error-text">{error}</p>}

            {result?.emergency && (
              <div className="urgent-card" role="alert">
                <strong>{t('emergencyTitle')}</strong>
                <p>{t('emergencyAction')}</p>
                {result.clinical_phrasing && (
                  <p lang="en" style={{ margin: '0.5rem 0 0' }}>
                    {result.clinical_phrasing}
                  </p>
                )}
              </div>
            )}
          </section>

          <section className="entry-panel">
            <h2>{t('pastEntries')}</h2>
            {notice && <p className="notice-text">{t(`notices.${notice}`)}</p>}
            <EntryList entries={entries} loading={loading} onEdit={edit} onDelete={remove} />
          </section>
        </>
      )}
    </main>
  )
}

export default function App() {
  const [user, setUser] = useState(null)
  const [authChecked, setAuthChecked] = useState(!isFirebaseConfigured())
  const [toast, setToast] = useState(null)

  useEffect(() => {
    // Not configured yet -> no gating at all, open access (authChecked is
    // already true from the initializer above).
    if (!isFirebaseConfigured()) return undefined

    return onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const friendlyUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
        }
        localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(friendlyUser))
        setUser(friendlyUser)
      } else {
        localStorage.removeItem(AUTH_USER_STORAGE_KEY)
        setUser(null)
      }
      setAuthChecked(true)
    })
  }, [])

  async function handleSignOut() {
    if (isFirebaseConfigured()) await signOut(auth)
    setToast({ type: 'info', message: 'Signed out.' })
  }

  if (!authChecked) {
    return (
      <main className="loading-shell">
        <div className="loading-mark" />
        <p>Checking secure session...</p>
      </main>
    )
  }

  if (isFirebaseConfigured() && !user) {
    return <AuthPage toast={toast} onToast={setToast} onToastDismiss={() => setToast(null)} />
  }

  return (
    <AuthedApp
      onSignOut={isFirebaseConfigured() ? handleSignOut : null}
      toast={toast}
      onToastDismiss={() => setToast(null)}
      user={user}
    />
  )
}
