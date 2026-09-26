// Voice-to-text button: click to start listening, click again to stop. What you
// say goes straight into the Symptoms text box.
export default function VoiceBox({ supported, listening, onStart, onStop, disabled }) {
  if (!supported) {
    return <span className="voice-unsupported">Voice to text isn't supported in this browser — try Chrome, Edge or Safari.</span>
  }

  return (
    <button type="button" onClick={listening ? onStop : onStart} disabled={disabled} aria-pressed={listening}>
      {listening ? 'Stop listening' : 'Click to speak'}
    </button>
  )
}
