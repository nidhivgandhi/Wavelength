# Wavelength

Helps log and compile health symptoms so patients can communicate them more
clearly to healthcare professionals, addressing the medical invalidation of
women's symptoms. It translates a patient's lived-experience description
into clinical-axis language (frequency, duration, functional impact,
onset) — it does **not** diagnose or name conditions. Built on GroqCloud for
fast inference.

**Live app:** https://wavelength-two-flame.vercel.app/

Deployed on Vercel from `main` — every push to `main` redeploys the live site.
Environment variables are set in the Vercel project settings (same names as
`.env`; values without quotes), and the deployed domain is listed under
Firebase → Authentication → Settings → Authorized domains.

## Stack

- Frontend: Vite + React (`src/`)
- Backend: Vercel serverless functions (`api/`)
- Auth: Firebase Authentication — **optional**, see note below
- Storage: Firebase-account-owned Supabase rows with a local offline cache
- Model: GroqCloud (OpenAI-compatible endpoint)

Firebase sign-in only activates once a real Firebase project is configured
(`VITE_FIREBASE_*` + server-side `FIREBASE_PROJECT_ID` in `.env`). With no
Firebase env vars set, the app is open-access — no sign-in screen, and
`/api/translate` accepts requests with no `Authorization` header — exactly
like before this was added. This is deliberate, not a bug: nobody had a
Firebase project to demo against yet, so the alternative was the whole app
being unusable behind a login wall. Set the env vars and it gates itself
automatically (`isFirebaseConfigured()` client-side, `isFirebaseAdminConfigured()`
server-side in `api/lib/firebaseAdmin.js`) — no other code changes needed.

## Getting started

```bash
npm install
cp .env.example .env   # then fill in Groq (+ Firebase/Supabase if you're using them)
```

- `npm run dev` — runs the frontend (Vite, port 5173) **and** a local API server (`server/dev-server.js`, port 3001) together. Vite proxies `/api/*` to the local server, so the browser can call `/api/translate` exactly as in production. This is what you want day-to-day.
- `vercel dev` — alternative that runs the actual Vercel serverless function runtime instead of `server/dev-server.js` (needs `npm i -g vercel` and `vercel login` once). Only needed if you're debugging something Vercel-runtime-specific; `npm run dev` covers everything else.

`server/dev-server.js` is dev-only scaffolding — it just wraps `api/translate.js` in an Express route so local dev doesn't require a Vercel account. Production (a real Vercel deploy) runs `api/translate.js` directly as a serverless function; that file is the source of truth, not the dev server.

## API contract: `POST /api/translate`

This contract is locked and now wired to the real Groq call (no longer a stub).
Once a real Firebase project is configured (see "Firebase setup" below), the
route requires a Firebase ID token:

```http
Authorization: Bearer <firebase-id-token>
```

`src/lib/intake.js`'s `postJson()` attaches the current user's ID token
automatically whenever someone is signed in (`auth.currentUser`), and omits
the header otherwise — so the same client code works whether or not Firebase
is configured. The backend verifies the token with Firebase Admin
(`api/lib/firebaseAdmin.js`) and uses the verified `uid`; never send or trust
`userId` in the request body/query for ownership. **Until `FIREBASE_PROJECT_ID`
is set on the server, this check is skipped entirely and the endpoint accepts
unauthenticated requests** — see the note in "Stack" above.

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

Error responses use `{ "error": "message" }` with a 4xx/5xx status (400 bad input, 429 rate limited, 502 upstream/malformed, 504 timeout, 500 unexpected; 401 for a missing/invalid token, but only once Firebase is actually configured — see above).

## Firebase setup

Optional — skip this entirely and the app runs open-access (see "Stack"
above). Do this when you actually want sign-in gating the app and the API.

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
- [x] Firebase Auth gate and protected API token verification (dormant until `FIREBASE_PROJECT_ID`/`VITE_FIREBASE_*` are set — see "Firebase setup")
- [x] Firebase-account-owned Supabase storage with an offline local cache
- [ ] Add Firebase as a Supabase Third-Party Auth provider and run `supabase/firebase_account_storage.sql` against the live project

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

## Account storage (Supabase + Firebase Auth)

1. In Supabase, open Authentication → Third-Party Auth and add the Firebase project whose ID matches `VITE_FIREBASE_PROJECT_ID`.
2. For an existing database, run [`supabase/firebase_account_storage.sql`](supabase/firebase_account_storage.sql) in the SQL Editor. For a new database, run [`supabase/schema.sql`](supabase/schema.sql).
3. Put the Supabase project URL (base URL only — no `/rest/v1/`) and anon key in `.env` (see `.env.example`).
4. Keep Firebase web config in the `VITE_FIREBASE_*` variables and `FIREBASE_PROJECT_ID` on the server. Never put a Supabase service-role key in the browser.

Supabase requests use the signed-in Firebase user's ID token; `user_id` stores that Firebase UID and RLS checks it against the verified JWT. The Supabase anon key alone cannot read or write symptom rows. If old entries are found only in the device cache, the app offers an explicit **Move entries to this account** action after sign-in.

Check the wiring at http://localhost:5173/test.html while `npm run dev` is running.

- [`src/lib/storage.js`](src/lib/storage.js) — `createEntry`, `saveEntry`, `listEntries`, `deleteEntry`, `syncPending`. Supabase rows are owned by the signed-in Firebase UID; failed/offline writes remain cached with `synced: false` and are retried by `syncPending()`.
- [`src/lib/intake.js`](src/lib/intake.js) — `submitIntake` / `updateIntake`: translate the symptom text, then save. The entry is saved even if translation fails.
- [`src/hooks/useEntries.js`](src/hooks/useEntries.js) — React hook: `{ entries, loading, notice, submit, edit, remove }`. Use this from any UI. `submit({ patientInput, inputMethod })` / `edit(entry, { patientInput, inputMethod })`; editing re-translates when the text changes.
- [`src/components/EntryForm.jsx`](src/components/EntryForm.jsx) / [`EntryList.jsx`](src/components/EntryList.jsx) — symptom text box + Complete log / Click to speak buttons (also used for editing) and the past-entries list (text + clinical phrasing). Placeholder styling.

## Voice input

[`src/hooks/useSpeechRecognition.js`](src/hooks/useSpeechRecognition.js) wraps the browser's built-in Web Speech API — no API key or extra service. Click **Click to speak** (next to Complete log) to start, **Stop listening** to stop; what you say is added to the Symptoms text live, and the entry is saved with `input_method: 'voice'`.

- Works in **Chrome, Edge, Safari**; **not Firefox** (the button is replaced by a notice there).
- Needs `localhost` or HTTPS, microphone permission, and an internet connection.
- Privacy: Chrome/Edge send the audio to Google/Microsoft for recognition. Worth stating in the UI given this is health data.

## Languages

A picker in the header switches the app's buttons/labels **and** the speech-recognition language. 21 languages: the 20 most-spoken in US homes plus Tamil (list in [`src/i18n/languages.js`](src/i18n/languages.js)). Arabic, Urdu and Persian switch the page to right-to-left. Haitian Creole has no browser speech recognition, so it's typing only. The choice is remembered per browser; first visit follows the browser's language.

- **Button text** lives in [`src/i18n/locales/`](src/i18n/locales/), one flat JSON file per language (`en.json` is the source). A missing file or key falls back to English.
- **Adding a language:** add one line to `languages.js`, then `npm run translate-ui` (needs `GROQ_API_KEY`). The script ([`scripts/translate-ui.mjs`](scripts/translate-ui.mjs)) machine-translates `en.json` into every language that's missing text, and only fills in missing keys — so corrections made by hand are never overwritten. `npm run translate-ui -- fr ko` limits it to some languages; `--force fr` redoes all of `fr`.
- **Adding a string:** add it to `en.json`, use it via `t('key')`, run `npm run translate-ui`.
- **Review:** all non-English text is machine-drafted. Have native speakers check it — especially `emergencyTitle` / `emergencyAction`.
- Components get text via `const { t, speechLocale } = useLanguage()` (`src/i18n/LanguageContext.jsx`); the app must be wrapped in `<LanguageProvider>` (done in `main.jsx`).
- Patients can type/speak in any of these languages; `/api/translate` returns the clinical phrasing in **English** (checked with Spanish and Chinese input), which is what the clinician reads.
- **English copy:** when the UI language isn't English, each entry's words are also translated to English via `POST /api/translate-english` (`{ text }` → `{ english_text, emergency }`, [`api/translate-english.js`](api/translate-english.js)) and saved as `patient_input_en`. The column is created by [`supabase/schema.sql`](supabase/schema.sql) or [`supabase/firebase_account_storage.sql`](supabase/firebase_account_storage.sql); [`supabase/add_english_copy.sql`](supabase/add_english_copy.sql) is the legacy standalone migration. Entries show the original plus "In English: …".
- **Emergency check for other languages:** `api/lib/emergencyCheck.js` only matches English phrases, so on its own "Tengo dolor de pecho y no puedo respirar" / "我胸口疼，喘不过气来" return `emergency: false` from `/api/translate`. `/api/translate-english` runs the same check on the English copy, and the app shows the urgent-care alert if either flags it. This depends on the model's translation, so native-language patterns in `emergencyCheck.js` would still be a good addition.
- **Low-detail hint:** when the clinical phrasing says there isn't enough detail, the entry shows what to add (the API's follow-up question in English; a translated generic hint otherwise).
