// Thin wrapper around Groq's OpenAI-compatible chat completions endpoint.
//
// Model choice: openai/gpt-oss-20b — confirmed available to this project's
// API key via GET /openai/v1/models (the Llama 3.x chat models referenced in
// some Groq docs/examples were NOT available on this key's account —
// verify against your own key with the same call before assuming a model
// ID). gpt-oss-20b is one of the models Groq lists as supporting *strict*
// Structured Outputs (response_format: json_schema, strict: true), which
// gives guaranteed schema compliance rather than best-effort JSON mode —
// see buildResponseFormat() below. It's also the smaller/faster of the two
// gpt-oss models on Groq (vs. openai/gpt-oss-120b), which fits the
// "fast, low-friction" framing for this tool; swap MODEL to
// 'openai/gpt-oss-120b' if quality matters more than latency for a given
// deployment.
//
// A manual-parse fallback (extractJson) is still kept as defense in depth
// per the brief, even though strict mode should make it unnecessary in
// practice — cheap insurance against a future model swap that only
// supports best-effort JSON mode.

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'openai/gpt-oss-20b';
const REQUEST_TIMEOUT_MS = 15000;

const RESPONSE_SCHEMA = {
  type: 'json_schema',
  json_schema: {
    name: 'clinical_translation',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        clinical_phrasing: { type: 'string' },
        why_it_matters: { type: 'string' },
        follow_up_question: { type: 'string' },
      },
      required: ['clinical_phrasing', 'why_it_matters', 'follow_up_question'],
      additionalProperties: false,
    },
  },
};

export const GROQ_MODEL = MODEL;

export class GroqError extends Error {
  constructor(message, { status, code, retryAfter } = {}) {
    super(message);
    this.name = 'GroqError';
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

/**
 * Pulls a JSON object out of a model response that may be wrapped in
 * markdown code fences or surrounded by stray prose — faster/smaller
 * open-weight models are more prone to this than larger closed models, even
 * with JSON mode requested. Returns null if nothing parseable is found.
 */
export function extractJson(raw) {
  if (typeof raw !== 'string') return null;
  let text = raw.trim();

  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch) text = fenceMatch[1].trim();

  try {
    return JSON.parse(text);
  } catch {
    // Fall back to the first {...} block in case of leading/trailing prose.
    const braceMatch = text.match(/\{[\s\S]*\}/);
    if (braceMatch) {
      try {
        return JSON.parse(braceMatch[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Calls Groq and returns the parsed JSON object from the model's response.
 * Throws GroqError for anything the caller needs to branch on (timeouts,
 * rate limits, malformed output, etc.) — it never returns a partial/guessed
 * result.
 */
export async function callGroq({ systemPrompt, userInput, responseFormat = RESPONSE_SCHEMA, maxCompletionTokens = 800 }) {
  if (!process.env.GROQ_API_KEY) {
    throw new GroqError('GROQ_API_KEY is not set', { code: 'missing_api_key' });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userInput },
        ],
        response_format: responseFormat,
        temperature: 0.3,
        // gpt-oss models spend part of the token budget on internal
        // reasoning before emitting the JSON answer, which counts against
        // max_completion_tokens — too low a limit truncates before the
        // schema-constrained JSON is finished. reasoning_effort: 'low' keeps
        // that budget small (this task doesn't need deep reasoning, and
        // lower effort = lower latency, which matters for a live tool) and
        // reasoning_format: 'hidden' is required by Groq when combining
        // reasoning models with JSON mode.
        reasoning_effort: 'low',
        reasoning_format: 'hidden',
        max_completion_tokens: maxCompletionTokens,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new GroqError('Groq request timed out', { code: 'timeout' });
    }
    throw new GroqError(`Groq request failed: ${err.message}`, { code: 'network_error' });
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 429) {
    const retryAfter = response.headers.get('retry-after');
    throw new GroqError('Groq rate limit hit', { status: 429, code: 'rate_limited', retryAfter });
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new GroqError(`Groq API error (${response.status}): ${body}`, {
      status: response.status,
      code: 'api_error',
    });
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  const parsed = extractJson(content);

  if (!parsed || typeof parsed !== 'object') {
    throw new GroqError('Groq response was not valid JSON', { code: 'malformed_json' });
  }

  return parsed;
}
