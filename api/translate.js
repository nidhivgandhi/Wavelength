// POST /api/translate
// body: { patientInput: string }
// returns: { clinical_phrasing, why_it_matters, follow_up_question, emergency }
//
// STUB — returns fixed placeholder data in the locked response shape so the
// frontend and any other consumers can be built against a stable contract
// immediately. No Groq call is made yet. See NOTES below for what's next.
//
// Schema (locked):
//   clinical_phrasing:   string  — the lived-experience input reframed along
//                                  clinical axes (frequency, duration,
//                                  functional impact, onset). Never a
//                                  condition name or diagnosis.
//   why_it_matters:      string  — plain-language explanation of why that
//                                  framing is useful to share with a clinician.
//   follow_up_question:  string  — one specific clarifying question, used
//                                  when input is vague/incomplete.
//   emergency:           boolean — true if a hardcoded safety check (not the
//                                  model) flagged the input as a possible
//                                  emergency. When true, clients should show
//                                  an urgent-care message and the other
//                                  fields may be minimal/absent.
//
// NEXT (tracked separately, not yet wired in):
//   - hardcoded emergency-keyword check, run before any model call
//   - real Groq call (see .env.example for GROQ_API_KEY)
//   - system prompt enforcing "organize, don't diagnose"
//   - manual JSON-parsing fallback for models without reliable JSON mode

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { patientInput } = req.body || {}

  if (typeof patientInput !== 'string' || !patientInput.trim()) {
    return res.status(400).json({ error: 'patientInput (non-empty string) is required' })
  }

  // ---- STUB RESPONSE ----------------------------------------------------
  // Fixed shape, no model call. Replace this block when the real prompt
  // and emergency check are wired in.
  return res.status(200).json({
    clinical_phrasing:
      'Placeholder: recurring lower-abdominal discomfort, intermittent, present for approximately three days.',
    why_it_matters:
      'Placeholder: duration and pattern help a clinician narrow down what might be going on and how urgently to follow up.',
    follow_up_question:
      'Placeholder: Has the discomfort changed in intensity or location since it started?',
    emergency: false,
  })
}
