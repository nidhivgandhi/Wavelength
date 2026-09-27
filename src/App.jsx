import { useEffect, useRef, useState } from 'react'
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

function TermsDialog({ onClose }) {
  return (
    <div className="terms-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section aria-labelledby="terms-title" aria-modal="true" className="terms-dialog" role="dialog">
        <div className="terms-dialog-heading"><div><p className="eyebrow">Wavelength</p><h2 id="terms-title">Terms and Conditions</h2><p>Last updated September 26, 2026</p></div><button aria-label="Close terms" className="terms-close" onClick={onClose} type="button">×</button></div>
        <div className="terms-content">
          <section><h3>1. What Wavelength does</h3><p>Wavelength helps you record symptoms and organize your own descriptions into language that may be easier to discuss with a healthcare professional. It is an informational journaling tool. It does not provide medical care, diagnose conditions, recommend treatment, or replace advice from a qualified professional. AI generated summaries and phrasing may be incomplete or incorrect; review them before sharing.</p></section>
          <section><h3>2. Urgent symptoms</h3><p>Do not use Wavelength for emergencies or to decide whether to seek care. The app’s automated urgent symptom checks can miss emergencies or flag a symptom incorrectly. If you may be experiencing an emergency, call your local emergency number or seek urgent medical care.</p></section>
          <section><h3>3. Your entries and how they are handled</h3><p>You control what you enter. Symptom text may include sensitive health information. To provide translations or summaries, the app sends relevant text to its configured AI service. Entries are kept in this browser and, when configured, synced to the app’s Supabase storage. The app may also use Firebase for account sign-in. Storage and service availability depend on the project configuration.</p></section>
          <section><h3>4. Voice input</h3><p>If you use voice input, your browser’s speech recognition feature processes audio to create text. The browser or speech recognition provider may process the audio under its own terms and privacy practices. You can use typing instead.</p></section>
          <section><h3>5. Use of the service</h3><p>Use the service lawfully and only for your own personal journaling. Keep your sign-in details secure, and do not rely on Wavelength as the only copy of information you need. You can review, edit, or delete entries using the app where those controls are available.</p></section>
          <section><h3>6. Changes and availability</h3><p>Features may change, be interrupted, or become unavailable. We may update these terms as the service changes. Continued use after updated terms are presented means you accept the updated terms.</p></section>
        </div>
        <div className="terms-dialog-actions"><button className="dashboard-save-button" onClick={onClose} type="button">Close</button></div>
      </section>
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
  const [showTerms, setShowTerms] = useState(false)
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
    if (isSignup && !acceptedTerms) {
      onToast({ type: 'error', message: 'Agree to the Terms and Conditions before continuing.' })
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
                <span>I agree to the <button className="terms-inline-link" onClick={(event) => { event.preventDefault(); event.stopPropagation(); setShowTerms(true) }} type="button">Terms and Conditions</button>.</span>
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
      {showTerms && <TermsDialog onClose={() => setShowTerms(false)} />}
    </main>
  )
}

// `onSignOut` and `user` are both null when Firebase isn't configured — the
// header just omits the identity line and the sign-out button in that case.
function AuthedApp({ onSignOut, toast, onToastDismiss, user }) {
  const { t } = useLanguage()
  const [activeView, setActiveView] = useState('dashboard')
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [intensity, setIntensity] = useState(4)
  const [indicators, setIndicators] = useState([])
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const profileMenuRef = useRef(null)
  const {
    entries,
    loading,
    notice,
    unownedLocalCount,
    migrating,
    submit,
    edit,
    remove,
    migrateDeviceEntries,
  } = useEntries()

  useEffect(() => {
    function closeMenu(event) {
      if (!profileMenuRef.current?.contains(event.target)) setProfileMenuOpen(false)
    }
    function closeOnEscape(event) {
      if (event.key === 'Escape') setProfileMenuOpen(false)
    }
    document.addEventListener('pointerdown', closeMenu)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeMenu)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  async function handleSubmit(input) {
    setError(null)
    setResult(null)
    const { entry, translateError } = await submit(input)
    if (translateError) setError(t('phrasingFailed', { message: translateError.message }))
    setResult(entry)
    if (!entry.emergency) setActiveView('analysis')
  }

  const navItems = [
    ['dashboard', 'Dashboard', '▦'], ['log', t('symptomLog'), '▤'],
    ['analysis', t('analysis'), '⌁'], ['wellness', 'Wellness Tips', '✦'],
  ]
  const title = activeView === 'analysis' ? t('analysisTitle') : activeView === 'log' ? t('symptomLog') : 'Hello, there!'
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const recentEntries = entries.slice(0, 3)

  return (
    <main className="dashboard-shell">
      <Toast toast={toast} onDismiss={onToastDismiss} />
      <aside className="dashboard-sidebar">
        <div className="dashboard-brand"><h1>Wavelength</h1><p>Wellness management</p></div>
        <nav aria-label={t('mainNavigation')} className="dashboard-nav">
          {navItems.map(([id, label, icon]) => <button key={id} className={`dashboard-nav-link ${activeView === id ? 'active' : ''}`} onClick={() => setActiveView(id)} type="button"><span aria-hidden="true">{icon}</span>{label}</button>)}
        </nav>
      </aside>
      <section className="dashboard-main">
        <header className="dashboard-header"><div><h2>{title}</h2><p>{activeView === 'dashboard' ? `Today is ${today}` : 'A clearer picture starts with your notes.'}</p></div><div className="dashboard-header-actions" ref={profileMenuRef}><button aria-label="Open profile menu" aria-expanded={profileMenuOpen} aria-haspopup="menu" className="dashboard-avatar" onClick={() => setProfileMenuOpen((open) => !open)} type="button">{(user?.displayName || user?.email || 'W').slice(0, 1).toUpperCase()}</button>{profileMenuOpen && <div className="dashboard-profile-menu" role="menu"><div className="dashboard-profile-info"><strong>{user?.displayName || 'Your profile'}</strong><span>{user?.email || 'Guest account'}</span></div><div className="dashboard-profile-language"><LanguagePicker /></div><button className="dashboard-profile-logout" onClick={() => { setProfileMenuOpen(false); setShowTerms(true) }} role="menuitem" type="button"><span aria-hidden="true">ⓘ</span>Terms and Conditions</button>{onSignOut && <button className="dashboard-profile-logout" onClick={() => { setProfileMenuOpen(false); onSignOut() }} role="menuitem" type="button"><span aria-hidden="true">↪</span>Log out</button>}</div>}</div></header>
        <div className="dashboard-content">
          {notice && <p className="notice-text" role="status">{t(`notices.${notice}`)}</p>}
          {unownedLocalCount > 0 && <div className="account-migration" role="status"><p>{t('deviceEntriesFound', { count: unownedLocalCount })}</p><button className="secondary-action" disabled={migrating} onClick={migrateDeviceEntries} type="button">{migrating ? t('movingEntries') : t('moveEntriesToAccount')}</button></div>}
          {activeView === 'analysis' ? <AnalysisView entries={entries} loading={loading} /> : activeView === 'log' ? <section className="dashboard-card history-card"><div className="dashboard-card-heading"><h3>{t('pastEntries')}</h3></div><EntryList entries={entries} loading={loading} onEdit={edit} onDelete={remove} /></section> : activeView === 'dashboard' ? <>
            <section className="dashboard-card journal-card">
              <div className="dashboard-card-heading"><h3>Symptom Journal</h3><button className="dashboard-text-action" onClick={() => setActiveView('log')} type="button">See all history</button></div>
              <p className="journal-prompt">How are you feeling today?</p>
              <div><EntryForm onSubmit={handleSubmit} submitLabel="Save & go to analytics" busyLabel={t('saving')} resetAfterSubmit dashboard /></div>
              <div className="dashboard-extra-controls">
                <div><label htmlFor="symptom-intensity">Intensity of symptoms <strong>{intensity}</strong></label><input id="symptom-intensity" className="intensity-range" type="range" min="1" max="10" value={intensity} onChange={(event) => setIntensity(Number(event.target.value))} /><div className="range-labels"><span>Mild</span><span>Severe</span></div></div>
                <div><span className="quick-label">Quick indicators <small>(not saved yet)</small></span><div className="indicator-list">{['Fatigue', 'Headache', 'Cramps', 'Bloating'].map((item) => <button aria-pressed={indicators.includes(item)} className={indicators.includes(item) ? 'selected' : ''} key={item} onClick={() => setIndicators((current) => current.includes(item) ? current.filter((value) => value !== item) : [...current, item])} type="button">{item}</button>)}</div></div>
              </div>
              {error && <p className="error-text">{error}</p>}
              {result?.emergency && <div className="urgent-card" role="alert"><strong>{t('emergencyTitle')}</strong><p>{t('emergencyAction')}</p>{result.clinical_phrasing && <p lang="en">{result.clinical_phrasing}</p>}</div>}
            </section>
            <p className="dashboard-footnote">Your entries are stored securely. Logging regularly can help you notice patterns over time.</p>
            {recentEntries.length > 0 && <section className="dashboard-card history-card"><div className="dashboard-card-heading"><h3>Recent entries</h3><button className="dashboard-text-action" onClick={() => setActiveView('log')} type="button">View history</button></div><EntryList entries={recentEntries} loading={loading} onEdit={edit} onDelete={remove} /></section>}
          </> : <section className="dashboard-card simple-view"><span className="simple-view-icon">✦</span><h3>Your wellness, at your pace</h3><p>Small, consistent notes can help you prepare for a conversation with your care team.</p></section>}
        </div>
      </section>
      {showTerms && <TermsDialog onClose={() => setShowTerms(false)} />}
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
