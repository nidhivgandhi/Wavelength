# Wavelength

Helps log and compile health symptoms so patients can communicate them more
clearly to healthcare professionals, addressing the medical invalidation of
women's symptoms. It translates a patient's lived-experience description
into clinical-axis language (frequency, duration, functional impact,
onset) — it does **not** diagnose or name conditions. Built on GroqCloud for
fast inference.

## Stack

- Frontend: Vite + React (`src/`)
- Backend: Vercel serverless functions (`api/`)
- Auth: Firebase Authentication
- Storage: localStorage with optional Supabase sync
- Model: GroqCloud (OpenAI-compatible endpoint)

## Getting started

```bash
npm install
cp .env.example .env   # then fill in Groq + Firebase values
```

- `npm run dev` — runs the frontend (Vite, port 5173) **and** a local API server (`server/dev-server.js`, port 3001) together. Vite proxies `/api/*` to the local server, so the browser can call `/api/translate` exactly as in production. This is what you want day-to-day.
- `vercel dev` — alternative that runs the actual Vercel serverless function runtime instead of `server/dev-server.js` (needs `npm i -g vercel` and `vercel login` once). Only needed if you're debugging something Vercel-runtime-specific; `npm run dev` covers everything else.

`server/dev-server.js` is dev-only scaffolding — it just wraps `api/translate.js` in an Express route so local dev doesn't require a Vercel account. Production (a real Vercel deploy) runs `api/translate.js` directly as a serverless function; that file is the source of truth, not the dev server.

## API contract: `POST /api/translate`

This contract is locked and now wired to the real Groq call (no longer a stub).
The route is protected by Firebase Auth. Clients must send a Firebase ID token:

```http
Authorization: Bearer <firebase-id-token>
```

The frontend uses `authedFetch()` from `src/lib/firebase.js` so API calls include
the current user's ID token automatically. The backend verifies that token with
Firebase Admin and uses the verified `uid`; never send or trust `userId` in the
request body/query for ownership.

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

Error responses use `{ "error": "message" }` with a 4xx/5xx status (401 unauthenticated, 400 bad input, 429 rate limited, 502 upstream/malformed, 503 missing Firebase Admin config, 504 timeout, 500 unexpected).

## Firebase setup

In Firebase Console:

1. Create/select a Firebase project.
2. Enable Authentication > Sign-in method > Email/Password.
3. Enable Authentication > Sign-in method > Google.
4. Add local and deployed domains under Authentication > Settings > Authorized domains:
   - `localhost`
   - your Vercel production domain
5. Copy the web app config into `.env` as the `VITE_FIREBASE_*` values.
6. Set `FIREBASE_PROJECT_ID` on the server. It must match `VITE_FIREBASE_PROJECT_ID`.

After changing `.env`, restart `npm run dev`.

## How it works

1. **Hardcoded emergency check first, always** (`api/lib/emergencyCheck.js`) — pattern-matches the raw input against known emergency phrasing (cardiac/respiratory, stroke signs, OB/GYN emergencies, anaphylaxis, mental health crisis, self-reported urgency). If it matches, the response is returned immediately with `emergency: true` and **no model call happens**. This never depends on the model — a fast/small model is not trusted to make this judgment under pressure. Known limitation: it's a blunt keyword matcher and can miss phrasing not covered by the patterns — extend the list in that file as gaps are found.
2. **Otherwise, call Groq** (`api/lib/groqClient.js`) with the locked system prompt (`api/lib/systemPrompt.js`), model `openai/gpt-oss-20b`, using strict Structured Outputs (`response_format: json_schema, strict: true`) so the model's JSON is schema-guaranteed rather than best-effort. A manual-parse fallback (`extractJson`) still exists as defense in depth.
3. The model is only ever asked for 3 keys (`clinical_phrasing`, `why_it_matters`, `follow_up_question`) — `emergency: false` is added by the endpoint itself for any response that reaches this point, never taken from the model.

**Prompt boundary ("organize, don't diagnose"):** the system prompt hard-blocks naming/implying any condition or diagnosis and diagnostic-certainty language ("you have," "this is," "this indicates"), forbids reassurance/alarm, and requires neutral clinical-axis phrasing (frequency, duration, functional impact, onset). For vague/short input, it's instructed to ask a clarifying `follow_up_question` rather than guess.

## Testing

`npm run test:translate` is a manual handler harness for the Groq prompt cases.
The browser flow now calls the protected route with `authedFetch()`, so full
end-to-end API testing requires signing in through Firebase first.

Groq's free-tier rate limits are account-specific — check the Limits page at https://console.groq.com before a demo. Rate-limit responses include `retry-after` / `x-ratelimit-*` headers, which `api/lib/groqClient.js` reads and surfaces as a 429 with a `Retry-After` header.

## Status

- [x] Stub endpoint replaced with the real, wired-up implementation
- [x] Hardcoded emergency-keyword check (runs before any model call)
- [x] Real system prompt ("organize, don't diagnose") wired into the endpoint
- [x] Strict Groq Structured Outputs + manual-parse fallback
- [x] Error handling for API failures / rate limits / timeouts / malformed JSON
- [x] Firebase Auth gate and protected API token verification
- [x] localStorage with optional Supabase sync

## Environment variables

| Name | Where | Notes |
|---|---|---|
| `GROQ_API_KEY` | server only, `.env` | Never prefix with `VITE_` — that would expose it in the client bundle. |
| `VITE_FIREBASE_API_KEY` | browser, `.env` | Firebase web app API key. |
| `VITE_FIREBASE_AUTH_DOMAIN` | browser, `.env` | Usually `<project>.firebaseapp.com`. |
| `VITE_FIREBASE_PROJECT_ID` | browser, `.env` | Must match your Firebase project. |
| `VITE_FIREBASE_STORAGE_BUCKET` | browser, `.env` | From Firebase web app config. |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | browser, `.env` | From Firebase web app config. |
| `VITE_FIREBASE_APP_ID` | browser, `.env` | From Firebase web app config. |
| `VITE_FIREBASE_MEASUREMENT_ID` | browser, `.env` | Optional if unused. |
| `FIREBASE_PROJECT_ID` | server only, `.env` | Used by Firebase Admin to verify ID tokens. Must match `VITE_FIREBASE_PROJECT_ID`. |
| `VITE_SUPABASE_URL` | browser, `.env` | Optional. Blank means the app uses localStorage only. |
| `VITE_SUPABASE_ANON_KEY` | browser, `.env` | Public anon key; RLS protects the data. Never use the `service_role` key here. |

## Storage (Supabase + localStorage fallback)

1. Create a Supabase project, then run [`supabase/schema.sql`](supabase/schema.sql) in the SQL Editor.
2. Authentication → Sign In / Providers → enable **Allow anonymous sign-ins**.
3. Put the project URL (base URL only — no `/rest/v1/`) and anon key in `.env` (see `.env.example`).

Check the wiring at http://localhost:5173/test.html while `npm run dev` is running.

- [`src/lib/storage.js`](src/lib/storage.js) — `createEntry`, `saveEntry`, `listEntries`, `deleteEntry`, `syncPending`. Writes land in localStorage first, then Supabase; anything that fails to upload stays `synced: false` and is pushed by `syncPending()`.
- [`src/lib/intake.js`](src/lib/intake.js) — `submitIntake` / `updateIntake`: translate the symptom text, then save. The entry is saved even if translation fails.
- [`src/hooks/useEntries.js`](src/hooks/useEntries.js) — React hook: `{ entries, loading, notice, submit, edit, remove }`. Use this from any UI. `submit({ patientInput, inputMethod })` / `edit(entry, { patientInput, inputMethod })`; editing re-translates when the text changes.
- [`src/components/EntryForm.jsx`](src/components/EntryForm.jsx) / [`EntryList.jsx`](src/components/EntryList.jsx) — symptom text box + Complete log / Click to speak buttons (also used for editing) and the past-entries list (text + clinical phrasing). Placeholder styling.

## Voice input

[`src/hooks/useSpeechRecognition.js`](src/hooks/useSpeechRecognition.js) wraps the browser's built-in Web Speech API — no API key or extra service. Click **Click to speak** (next to Complete log) to start, **Stop listening** to stop; what you say is added to the Symptoms text live, and the entry is saved with `input_method: 'voice'`.

- Works in **Chrome, Edge, Safari**; **not Firefox** (the button is replaced by a notice there).
- Needs `localhost` or HTTPS, microphone permission, and an internet connection.
- Privacy: Chrome/Edge send the audio to Google/Microsoft for recognition. Worth stating in the UI given this is health data.
