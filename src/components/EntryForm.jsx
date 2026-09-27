import { useId, useRef, useState } from 'react'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition.js'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import VoiceBox from './VoiceBox.jsx'

// Symptom text box + "Click to speak" button, used for new entries and for editing.
// Speech is recognized in the language picked in <LanguagePicker>.
// Styles: .entry-form / .form-actions / *-action buttons in src/index.css.
//
// onSubmit({ patientInput, inputMethod }) — pass to useEntries().submit or wrap
// useEntries().edit. Awaited; the form shows "busy" until it resolves.
export default function EntryForm({
  initialText = '',
  onSubmit,
  onCancel,
  submitLabel,
  busyLabel,
  resetAfterSubmit = false,
  dashboard = false,
}) {
  const { t, has, speechLocale } = useLanguage()
  const [text, setText] = useState(initialText)
  const [usedVoice, setUsedVoice] = useState(false)
  const [busy, setBusy] = useState(false)
  const textId = useId()

  // Text already in the box when dictation started; speech is appended to it.
  const textBeforeDictation = useRef('')
  const speech = useSpeechRecognition({
    onTranscript: (words) => {
      const before = textBeforeDictation.current.trimEnd()
      setText(before ? `${before} ${words}` : words)
    },
    lang: speechLocale,
  })

  function startDictation() {
    textBeforeDictation.current = text
    setUsedVoice(true)
    speech.start()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    speech.cancel()
    setBusy(true)
    try {
      await onSubmit({ patientInput: text, inputMethod: usedVoice ? 'voice' : 'text' })
      if (resetAfterSubmit) {
        setText('')
        setUsedVoice(false)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className={dashboard ? 'dashboard-entry-form' : 'entry-form'} onSubmit={handleSubmit}>
      {!dashboard && <label htmlFor={textId}>{t('symptomsLabel')}</label>}
      <textarea
        className={dashboard ? 'dashboard-textarea' : undefined}
        aria-label={dashboard ? t('symptomsLabel') : undefined}
        id={textId}
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          if (!e.target.value) setUsedVoice(false)
        }}
        readOnly={speech.listening}
        placeholder={t('symptomsPlaceholder')}
        rows={dashboard ? 7 : 4}
      />
      <div className={dashboard ? 'dashboard-form-actions' : 'form-actions'}>
        {dashboard ? (
          <button className="dashboard-voice-button" type="button" onClick={speech.listening ? speech.stop : startDictation} disabled={busy || !speech.supported || !speechLocale} aria-pressed={speech.listening}>
            {speech.listening ? t('stopListening') : '◖ Voice recording'}
          </button>
        ) : (
          <button className="primary-action" type="submit" disabled={busy || !text.trim()}>
            {busy ? busyLabel ?? t('saving') : submitLabel ?? t('saveChanges')}
          </button>
        )}
        {!dashboard && <VoiceBox
          supported={speech.supported}
          languageSupported={Boolean(speechLocale)}
          listening={speech.listening}
          onStart={startDictation}
          onStop={speech.stop}
          disabled={busy}
        />}
        {speech.listening && <span className="listening-text">{t('listening')}</span>}
        {onCancel && (
          <button className="ghost-action" type="button" onClick={onCancel} disabled={busy}>
            {t('cancel')}
          </button>
        )}
        {dashboard && <button className="dashboard-save-button" type="submit" disabled={busy || !text.trim()}>{busy ? busyLabel ?? t('saving') : submitLabel ?? t('saveChanges')}</button>}
      </div>
      {speech.error && (
        <small className="form-error">
          {has(`voiceErrors.${speech.error}`)
            ? t(`voiceErrors.${speech.error}`)
            : t('voiceErrors.other', { code: speech.error })}
        </small>
      )}
    </form>
  )
}
