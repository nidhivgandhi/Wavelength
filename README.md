# Wavelength

This helps log and compile health symptoms to provide healthcare professionals to address medical invalidation of womens' symptoms. It does not 

Translates a patient's lived-experience description of symptoms into
clinical-axis language (frequency, duration, functional impact, onset) to address the medical invalidation of womens' symptoms. It does **not** diagnose or name conditions. Built on GroqCloud for fast inference.

## Stack

- Frontend: Vite + React (`src/`)
- Backend: Vercel serverless functions (`api/`)
- Model: GroqCloud (OpenAI-compatible endpoint)

## Getting started

```bash
npm install
cp .env.example .env   # then fill in GROQ_API_KEY
```

- `npm run dev` — frontend only (Vite). The `/api/*` routes will 404 in this mode.
- `vercel dev` — frontend + `/api/*` serverless functions together (needs `npm i -g vercel` and `vercel login` once). Use this to actually exercise `/api/translate`.

## API contract: `POST /api/translate`

This contract is locked and now wired to the real Groq call (no longer a stub).

**Request**

```json
{ "patientInput": "string", "context": "string (optional)" }
```

`context` is an optional free-text field for domain/contextual data (exact
shape still TBD with whoever owns that data). It's appended to the system
prompt as reference material only — it cannot change the output schema or
override the safety rules (see `api/lib/systemPrompt.js`).

**Response**

```json
{
  "clinical_phrasing": "string",
  "why_it_matters": "string",
  "follow_up_question": "string",
  "emergency": false
}
```

| Field | Type | Meaning |
|---|---|---|
| `clinical_phrasing` | string | The input reframed along clinical axes (frequency, duration, functional impact, onset). Never a condition name or diagnosis. |
| `why_it_matters` | string | Plain-language reason this framing is useful to share with a clinician. |
| `follow_up_question` | string | One specific clarifying question — used when input is vague/incomplete. |
| `emergency` | boolean | `true` if a hardcoded keyword safety check (not the model) flagged the input as a possible emergency. This is always set by `api/lib/emergencyCheck.js` — never by the model, structurally, not just by instruction. When `true`, the model is never called at all; the frontend should show an urgent-care message (`clinical_phrasing` already contains a 911/ER directive) and treat the other fields as not the focus. |

Error responses use `{ "error": "message" }` with a 4xx/5xx status (400 bad input, 429 rate limited, 502 upstream/malformed, 504 timeout, 500 unexpected).

## How it works

1. **Hardcoded emergency check first, always** (`api/lib/emergencyCheck.js`) — pattern-matches the raw input against known emergency phrasing (cardiac/respiratory, stroke signs, OB/GYN emergencies, anaphylaxis, mental health crisis, self-reported urgency). If it matches, the response is returned immediately with `emergency: true` and **no model call happens**. This never depends on the model — a fast/small model is not trusted to make this judgment under pressure. Known limitation: it's a blunt keyword matcher and can miss phrasing not covered by the patterns — extend the list in that file as gaps are found.
2. **Otherwise, call Groq** (`api/lib/groqClient.js`) with the locked system prompt (`api/lib/systemPrompt.js`), model `openai/gpt-oss-20b`, using strict Structured Outputs (`response_format: json_schema, strict: true`) so the model's JSON is schema-guaranteed rather than best-effort. A manual-parse fallback (`extractJson`) still exists as defense in depth.
3. The model is only ever asked for 3 keys (`clinical_phrasing`, `why_it_matters`, `follow_up_question`) — `emergency: false` is added by the endpoint itself for any response that reaches this point, never taken from the model.

**Prompt boundary ("organize, don't diagnose"):** the system prompt hard-blocks naming/implying any condition or diagnosis and diagnostic-certainty language ("you have," "this is," "this indicates"), forbids reassurance/alarm, and requires neutral clinical-axis phrasing (frequency, duration, functional impact, onset). For vague/short input, it's instructed to ask a clarifying `follow_up_question` rather than guess.

**Model note:** `llama-3.3-70b-versatile` (referenced in some Groq examples/docs) was **not available** on this project's API key — verify with `GET https://api.groq.com/openai/v1/models` against your own key before assuming a model ID, since access varies by account. `openai/gpt-oss-20b`/`120b` were available and support strict Structured Outputs; `20b` is used for speed (swap to `120b` in `groqClient.js` if quality matters more than latency).

**Reasoning-model gotcha:** `gpt-oss` models spend part of their token budget on internal reasoning before the JSON answer, which counts against `max_completion_tokens` — too low a limit truncates before valid JSON is produced. Fixed here with `reasoning_effort: "low"` + `reasoning_format: "hidden"` + a generous token budget. Worth knowing if you ever see `json_validate_failed` / "max completion tokens reached" errors from Groq.

## Testing

`npm run test:translate` runs 15 hand-written cases against the live endpoint (real Groq calls) covering: clear well-articulated input, vague/rambling input, near-miss emergency phrasing (concerning but shouldn't trip the hardcoded check), genuine emergency phrasing (should trip it, 0 model calls), and empty/minimal input. All 15 currently pass manual review for: no diagnostic language, useful/neutral clinical phrasing, specific follow-up questions, and valid JSON. The suite also naturally exercised the 429 rate-limit path and a malformed-JSON path (during debugging) — both returned the intended fallback error shape instead of crashing.

Groq's free-tier rate limits are account-specific — check the Limits page at https://console.groq.com before a demo. Rate-limit responses include `retry-after` / `x-ratelimit-*` headers, which `api/lib/groqClient.js` reads and surfaces as a 429 with a `Retry-After` header.

## Status

- [x] Stub endpoint replaced with the real, wired-up implementation
- [x] Hardcoded emergency-keyword check (runs before any model call)
- [x] Real system prompt ("organize, don't diagnose") wired into the endpoint
- [x] Strict Groq Structured Outputs + manual-parse fallback
- [x] 15-case test suite run and manually reviewed; prompt iterated once (fixed first-person phrasing on vague input)
- [x] Error handling for API failures / rate limits / timeouts / malformed JSON

## Environment variables

| Name | Where | Notes |
|---|---|---|
| `GROQ_API_KEY` | server only, `.env` | Never prefix with `VITE_` — that would expose it in the client bundle. |
