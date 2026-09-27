import { LANGUAGES } from '../i18n/languages.js'
import { useLanguage } from '../i18n/LanguageContext.jsx'

// Dropdown that switches the UI language and the speech-recognition language.
export default function LanguagePicker() {
  const { language, setLanguage, t } = useLanguage()

  return (
    <label className="language-picker">
      {t('languageLabel')}
      <select value={language} onChange={(e) => setLanguage(e.target.value)}>
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code} lang={l.code}>
            {l.label}
          </option>
        ))}
      </select>
    </label>
  )
}
