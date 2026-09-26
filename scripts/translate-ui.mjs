// Generates the UI text files in src/i18n/locales/ by machine-translating
// en.json with the same Groq model the app uses. Needs GROQ_API_KEY in .env.
//
//   npm run translate-ui              # fill in every language's missing keys
//   npm run translate-ui -- fr ko     # only these languages
//   npm run translate-ui -- --force fr   # re-translate ALL of fr's keys
//
// Only missing keys are translated by default, so text a native speaker has
// already corrected is never overwritten. After adding a string to en.json,
// run this to fill it in everywhere. Review the output (especially
// emergencyTitle / emergencyAction) before relying on it.

import 'dotenv/config'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { LANGUAGES } from '../src/i18n/languages.js'

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = 'openai/gpt-oss-120b' // bigger model: quality matters more than speed here
const LOCALES_DIR = fileURLToPath(new URL('../src/i18n/locales/', import.meta.url))

const args = process.argv.slice(2)
const force = args.includes('--force')
const only = args.filter((a) => !a.startsWith('--'))

const english = JSON.parse(readFileSync(`${LOCALES_DIR}en.json`, 'utf8'))
const placeholders = (text) => (text.match(/\{\w+\}/g) || []).sort().join(',')

function systemPrompt(languageName) {
  return `You translate the interface text of a women's health symptom-tracking app from English into ${languageName}.

Rules:
- Translate each value; keep every key exactly as given.
- Keep placeholders like {message}, {question}, {code} exactly as written (do not translate or remove them).
- Keep product/brand names unchanged: Chrome, Edge, Safari. Keep "911" as is.
- Buttons and labels should be short and natural, like a native-language app would say them.
- Use a warm, respectful, plain register suitable for patients; avoid slang.
- Emergency text ("emergencyTitle", "emergencyAction") must be clear and unambiguous.
- Use the standard script for the language.

Respond with a JSON object with exactly the same keys, values translated.`
}

async function translateBatch(language, entries) {
  const keys = Object.keys(entries)
  const body = {
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt(language.name) },
      { role: 'user', content: JSON.stringify(entries, null, 2) },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'ui_translation',
        strict: true,
        schema: {
          type: 'object',
          properties: Object.fromEntries(keys.map((k) => [k, { type: 'string' }])),
          required: keys,
          additionalProperties: false,
        },
      },
    },
    temperature: 0.2,
    reasoning_effort: 'low',
    reasoning_format: 'hidden',
    max_completion_tokens: 8000,
  }

  for (let attempt = 1; ; attempt++) {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.status === 429 && attempt < 5) {
      const wait = Number(res.headers.get('retry-after')) || 10 * attempt
      console.log(`  rate limited, waiting ${wait}s…`)
      await new Promise((r) => setTimeout(r, wait * 1000))
      continue
    }
    if (!res.ok) throw new Error(`Groq API error ${res.status}: ${await res.text()}`)
    const data = await res.json()
    return JSON.parse(data.choices[0].message.content)
  }
}

async function main() {
  if (!process.env.GROQ_API_KEY) {
    console.error('GROQ_API_KEY is not set — add it to .env first.')
    process.exit(1)
  }

  const targets = LANGUAGES.filter((l) => l.code !== 'en' && (only.length === 0 || only.includes(l.code)))
  for (const unknown of only.filter((c) => !LANGUAGES.some((l) => l.code === c))) {
    console.warn(`Skipping "${unknown}": not in src/i18n/languages.js`)
  }

  let failures = 0
  for (const language of targets) {
    const path = `${LOCALES_DIR}${language.code}.json`
    const existing = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {}
    const todo = Object.fromEntries(
      Object.entries(english).filter(([key]) => force || typeof existing[key] !== 'string'),
    )
    if (Object.keys(todo).length === 0) {
      console.log(`${language.code}: up to date`)
      continue
    }

    process.stdout.write(`${language.code} (${language.name}): translating ${Object.keys(todo).length} strings… `)
    try {
      const translated = await translateBatch(language, todo)
      const skipped = []
      for (const [key, text] of Object.entries(translated)) {
        if (!(key in todo) || typeof text !== 'string' || !text.trim()) continue
        if (placeholders(text) !== placeholders(english[key])) {
          skipped.push(key) // lost/changed a {placeholder} — leave it to fall back to English
          continue
        }
        existing[key] = text.trim()
      }
      // Write keys in en.json order so diffs stay readable.
      const ordered = Object.fromEntries(
        Object.keys(english).filter((k) => k in existing).map((k) => [k, existing[k]]),
      )
      writeFileSync(path, JSON.stringify(ordered, null, 2) + '\n', 'utf8')
      console.log(skipped.length ? `done (skipped ${skipped.join(', ')})` : 'done')
    } catch (err) {
      failures++
      console.log('FAILED')
      console.error(`  ${err.message}`)
    }
  }

  console.log('\nReview the new files in src/i18n/locales/ — especially emergencyTitle and emergencyAction.')
  if (failures) process.exit(1)
}

main()
