// POST /api/translate-english
// body: { text: string }
// returns: { english_text: string, emergency: boolean }
//
// Translates a patient's own words into English (for entries logged in
// Spanish/Hindi/Chinese/etc.) so a clinician can read them.
//
// `emergency` runs the same hardcoded checkEmergency() used by /api/translate
// on BOTH the original text and the English translation. That check only knows
// English phrases, so this is what lets non-English emergencies ("dolor de
// pecho", "胸口疼") trip it. The client ORs this with /api/translate's flag.

import { checkEmergency } from './lib/emergencyCheck.js';
import { translateToEnglish } from './lib/englishTranslator.js';
import { GroqError } from './lib/groqClient.js';

const MAX_LENGTH = 5000;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text } = req.body || {};
  if (typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'text (non-empty string) is required' });
  }
  if (text.length > MAX_LENGTH) {
    return res.status(400).json({ error: `text must be at most ${MAX_LENGTH} characters` });
  }

  try {
    const englishText = await translateToEnglish(text);
    return res.status(200).json({
      english_text: englishText,
      emergency: checkEmergency(text) || checkEmergency(englishText),
    });
  } catch (err) {
    if (err instanceof GroqError && err.code === 'rate_limited') {
      if (err.retryAfter) res.setHeader('Retry-After', err.retryAfter);
      return res.status(429).json({ error: 'Too many requests right now. Please try again shortly.' });
    }
    if (err instanceof GroqError && err.code === 'timeout') {
      return res.status(504).json({ error: 'The translation took too long. Please try again.' });
    }
    console.error('Error in /api/translate-english:', err.message);
    return res.status(502).json({ error: 'The translation service is temporarily unavailable. Please try again.' });
  }
}
