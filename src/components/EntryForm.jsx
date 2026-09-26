import { useId, useRef, useState } from 'react'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition.js'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import VoiceBox from './VoiceBox.jsx'

// Symptom text box + "Click to speak" button, used for new entries and for editing.
// Speech is recognized in the language picked in <LanguagePicker>.
// Placeholder styling — swap for the real design.
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
    <form onSubmit={handleSubmit}>
      <label htmlFor={textId} style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>
        {t('symptomsLabel')}
      </label>
      <textarea
        id={textId}
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          if (!e.target.value) setUsedVoice(false)
        }}
        readOnly={speech.listening}
        placeholder={t('symptomsPlaceholder')}
        rows={4}
        style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '1rem' }}
      />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
        <button type="submit" disabled={busy || !text.trim()}>
          {busy ? busyLabel ?? t('saving') : submitLabel ?? t('saveChanges')}
        </button>
        <VoiceBox
          supported={speech.supported}
          languageSupported={Boolean(speechLocale)}
          listening={speech.listening}
          onStart={startDictation}
          onStop={speech.stop}
          disabled={busy}
        />
        {speech.listening && <small style={{ color: 'crimson' }}>{t('listening')}</small>}
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={busy}>
            {t('cancel')}
          </button>
        )}
      </div>
      {speech.error && (
        <small style={{ color: 'crimson' }}>
          {has(`voiceErrors.${speech.error}`)
            ? t(`voiceErrors.${speech.error}`)
            : t('voiceErrors.other', { code: speech.error })}
        </small>
      )}
    </form>
  )
}
