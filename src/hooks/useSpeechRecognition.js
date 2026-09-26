import { useCallback, useEffect, useRef, useState } from 'react'

// Browser speech-to-text (Web Speech API). Supported in Chrome, Edge and
// Safari; not in Firefox. Note: Chrome/Edge send the audio to Google/Microsoft
// servers for recognition.
const SpeechRecognition =
  typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null

//   const { supported, listening, error, start, stop, cancel } =
//     useSpeechRecognition({ onTranscript, lang: 'es-US' })
//
// onTranscript(text) is called with the full transcript of the current
// session (final + in-progress words) every time it changes. `lang` is a BCP-47
// locale for recognition. `error` is the Web Speech error code (e.g.
// 'not-allowed', 'no-speech') so the UI can show it in its own language;
// 'service-not-allowed' is reported as 'not-allowed'.
export function useSpeechRecognition({ onTranscript, lang }) {
  const [listening, setListening] = useState(false)
  const [error, setError] = useState(null)
  const recognitionRef = useRef(null)
  const onTranscriptRef = useRef(onTranscript)

  useEffect(() => {
    onTranscriptRef.current = onTranscript
  }, [onTranscript])

  const start = useCallback(() => {
    if (!SpeechRecognition || recognitionRef.current) return
    setError(null)

    const recognition = new SpeechRecognition()
    recognition.lang = lang || navigator.language || 'en-US'
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onresult = (event) => {
      let text = ''
      for (let i = 0; i < event.results.length; i++) text += event.results[i][0].transcript
      onTranscriptRef.current?.(text.trim())
    }
    recognition.onerror = (event) => {
      if (event.error === 'aborted') return
      setError(event.error === 'service-not-allowed' ? 'not-allowed' : event.error)
    }
    recognition.onend = () => {
      recognitionRef.current = null
      setListening(false)
    }

    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }, [lang])

  // Stop listening; words still being processed are delivered via onTranscript.
  const stop = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  // Stop listening and drop anything not yet delivered (e.g. on submit, so late
  // results don't refill a cleared text box).
  const cancel = useCallback(() => {
    const recognition = recognitionRef.current
    if (!recognition) return
    recognition.onresult = null
    recognition.abort()
  }, [])

  // Stop the mic if the component using it goes away.
  useEffect(() => () => recognitionRef.current?.abort(), [])

  return { supported: Boolean(SpeechRecognition), listening, error, start, stop, cancel }
}
