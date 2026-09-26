import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { LANGUAGES } from './languages.js'

// App-wide UI language. Wrap the app in <LanguageProvider>, then:
//
//   const { t, has, language, setLanguage, locale, speechLocale, dir } = useLanguage()
//   t('completeLog')                          -> 'Complete log' / 'Completar registro' / …
//   t('phrasingFailed', { message: 'x' })     -> fills in {message}
//
// Text comes from ./locales/<code>.json (flat "key": "text" files). A language
// with no file, or a missing key, falls back to English. `speechLocale` is null
// for languages browsers can't recognize (e.g. Haitian Creole).
//
// The choice is remembered in localStorage; the first visit follows the
// browser's language when it's one we offer.

const STORAGE_KEY = 'wavelength.language'
const LanguageContext = createContext(null)

// { en: {...}, es: {...}, ... } — every locales/*.json file, bundled.
const TABLES = Object.fromEntries(
  Object.entries(import.meta.glob('./locales/*.json', { eager: true, import: 'default' })).map(([path, table]) => [
    path.match(/([\w-]+)\.json$/)[1],
    table,
  ]),
)
const ENGLISH = TABLES.en

function findLanguage(code) {
  return LANGUAGES.find((l) => l.code === code)
}

function initialLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (findLanguage(saved)) return saved
  } catch {
    // storage blocked — fall through
  }
  const browser = (navigator.language || 'en').toLowerCase()
  const match = findLanguage(browser.slice(0, 2)) || (browser.startsWith('fil') && findLanguage('tl'))
  return match ? match.code : 'en'
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(initialLanguage)

  const setLanguage = useCallback((code) => {
    setLanguageState(code)
    try {
      localStorage.setItem(STORAGE_KEY, code)
    } catch {
      // not remembered, still switches
    }
  }, [])

  const value = useMemo(() => {
    const info = findLanguage(language) ?? LANGUAGES[0]
    const table = TABLES[language] ?? {}
    const t = (key, vars) => {
      const text = table[key] ?? ENGLISH[key] ?? key
      return vars ? text.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? vars[name] : match)) : text
    }
    return {
      language,
      setLanguage,
      t,
      has: (key) => key in ENGLISH,
      speechLocale: info.speech,
      locale: info.speech ?? info.code, // for dates
      dir: info.dir ?? 'ltr',
    }
  }, [language, setLanguage])

  useEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dir = value.dir
  }, [language, value.dir])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const value = useContext(LanguageContext)
  if (!value) throw new Error('useLanguage must be used inside <LanguageProvider>')
  return value
}
