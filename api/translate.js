// POST /api/translate
// body: { patientInput: string, context?: string }
// returns: { clinical_phrasing, why_it_matters, follow_up_question, emergency }
//
// `emergency` is ALWAYS set by the hardcoded checkEmergency() below, never by
// the model — this is a structural guarantee, not a prompt instruction. If
// checkEmergency() trips, the model is never called at all.
//
// `context` is an optional free-text field for domain/contextual data
// (shape TBD with whoever owns that data) — see systemPrompt.js. It's
// appended to the system prompt as reference material and cannot change the
// output schema or override the hard rules.

import { checkEmergency, EMERGENCY_MESSAGE } from './lib/emergencyCheck.js';
import { buildSystemPrompt, MODEL_OUTPUT_KEYS } from './lib/systemPrompt.js';
import { callGroq, GroqError } from './lib/groqClient.js';

const EMERGENCY_RESPONSE = {
  clinical_phrasing: EMERGENCY_MESSAGE,
  why_it_matters:
    'Symptoms described this way can indicate something that needs medical attention right away, and a short delay could matter.',
  follow_up_question: '',
  emergency: true,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { patientInput, context } = req.body || {};

  if (typeof patientInput !== 'string' || !patientInput.trim()) {
    return res.status(400).json({ error: 'patientInput (non-empty string) is required' });
  }

  // Hardcoded safety check runs first, unconditionally, before any model
  // call. Emergency routing never depends on the model making the right
  // judgment call under pressure.
  if (checkEmergency(patientInput)) {
    return res.status(200).json(EMERGENCY_RESPONSE);
  }

  try {
    const systemPrompt = buildSystemPrompt(context);
    const parsed = await callGroq({ systemPrompt, userInput: patientInput });

    const missingKeys = MODEL_OUTPUT_KEYS.filter((key) => typeof parsed[key] !== 'string');
    if (missingKeys.length > 0) {
      throw new GroqError(`Model response missing keys: ${missingKeys.join(', ')}`, {
        code: 'invalid_shape',
      });
    }

    return res.status(200).json({
      clinical_phrasing: parsed.clinical_phrasing,
      why_it_matters: parsed.why_it_matters,
      follow_up_question: parsed.follow_up_question,
      emergency: false,
    });
  } catch (err) {
    if (err instanceof GroqError) {
      if (err.code === 'rate_limited') {
        if (err.retryAfter) res.setHeader('Retry-After', err.retryAfter);
        return res.status(429).json({
          error: 'The translation service is receiving too many requests right now. Please try again shortly.',
        });
      }
      if (err.code === 'timeout') {
        return res
          .status(504)
          .json({ error: 'The translation service took too long to respond. Please try again.' });
      }
      if (err.code === 'malformed_json' || err.code === 'invalid_shape') {
        console.error('Groq returned malformed/invalid output:', err.message);
        return res
          .status(502)
          .json({ error: 'Could not process that response. Please rephrase and try again.' });
      }
      console.error('Groq API error:', err.message);
      return res
        .status(502)
        .json({ error: 'The translation service is temporarily unavailable. Please try again.' });
    }

    console.error('Unexpected error in /api/translate:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
