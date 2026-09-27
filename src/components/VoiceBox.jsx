import { useLanguage } from '../i18n/LanguageContext.jsx'

// Voice-to-text button: click to start listening, click again to stop. What you
// say goes straight into the Symptoms text box. Replaced by a note when the
// browser has no speech recognition, or can't recognize the chosen language.
export default function VoiceBox({ supported, languageSupported = true, listening, onStart, onStop, disabled }) {
  const { t } = useLanguage()

  if (!supported) return <span className="voice-unsupported">{t('voiceUnsupported')}</span>
  if (!languageSupported) return <span className="voice-unsupported">{t('voiceLanguageUnsupported')}</span>

  return (
    <button
      className={listening ? 'record-action recording' : 'record-action'}
      type="button"
      onClick={listening ? onStop : onStart}
      disabled={disabled}
      aria-pressed={listening}
    >
      <span aria-hidden="true" className="record-dot" />
      {listening ? t('stopListening') : t('clickToSpeak')}
    </button>
  )
}
