import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { LANGUAGES, STRINGS } from './strings.js'

// App-wide UI language. Wrap the app in <LanguageProvider>, then:
//
//   const { t, language, setLanguage, locale } = useLanguage()
//   t('completeLog')                          -> 'Complete log' / 'Completar registro' / …
//   t('phrasingFailed', { message: 'x' })     -> fills in {message}
//
// The choice is remembered in localStorage; the first visit follows the
// browser's language when it's one we support.

const STORAGE_KEY = 'wavelength.language'
const LanguageContext = createContext(null)

function initialLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (LANGUAGES.some((l) => l.code === saved)) return saved
  } catch {
    // storage blocked — fall through
  }
  const browser = (navigator.language || 'en').slice(0, 2).toLowerCase()
  return LANGUAGES.some((l) => l.code === browser) ? browser : 'en'
}

function lookup(table, key) {
  return key.split('.').reduce((node, part) => (node == null ? undefined : node[part]), table)
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

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  const value = useMemo(() => {
    const locale = LANGUAGES.find((l) => l.code === language)?.locale ?? 'en-US'
    const t = (key, vars) => {
      const text = lookup(STRINGS[language], key) ?? lookup(STRINGS.en, key) ?? key
      return typeof text === 'string' && vars
        ? text.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? vars[name] : match))
        : text
    }
    return { language, setLanguage, locale, t }
  }, [language, setLanguage])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const value = useContext(LanguageContext)
  if (!value) throw new Error('useLanguage must be used inside <LanguageProvider>')
  return value
}
