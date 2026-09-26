import { useLanguage } from '../i18n/LanguageContext.jsx'

// Voice-to-text button: click to start listening, click again to stop. What you
// say goes straight into the Symptoms text box.
export default function VoiceBox({ supported, listening, onStart, onStop, disabled }) {
  const { t } = useLanguage()

  if (!supported) {
    return <span className="voice-unsupported">{t('voiceUnsupported')}</span>
  }

  return (
    <button type="button" onClick={listening ? onStop : onStart} disabled={disabled} aria-pressed={listening}>
      {listening ? t('stopListening') : t('clickToSpeak')}
    </button>
  )
}
