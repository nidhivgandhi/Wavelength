# Women's Wellness

Translates a patient's lived-experience description of symptoms into
clinical-axis language (frequency, duration, functional impact, onset) —
**never** a diagnosis or condition name. Built on GroqCloud for fast
inference.

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

This contract is locked. Build against it now — it currently returns stub
data (see `api/translate.js`) so frontend work isn't blocked on prompt work.

**Request**

```json
{ "patientInput": "string" }
```

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
| `emergency` | boolean | `true` if a hardcoded keyword safety check (not the model) flagged the input as a possible emergency. When `true`, the frontend should show an urgent-care message (call 911 / go to the ER); treat the other fields as minimal/not the focus in that case. |

Error responses use `{ "error": "message" }` with a 4xx/5xx status.

## Status

- [x] Stub endpoint live, returns fixed placeholder data in the locked shape
- [ ] Hardcoded emergency-keyword check (runs before any model call)
- [ ] Real system prompt ("organize, don't diagnose") wired into the endpoint
- [ ] Groq JSON-mode + manual-parse fallback
- [ ] Test suite of varied inputs reviewed manually
- [ ] Error handling for API failures / rate limits / malformed JSON

## Environment variables

| Name | Where | Notes |
|---|---|---|
| `GROQ_API_KEY` | server only, `.env` | Never prefix with `VITE_` — that would expose it in the client bundle. |
