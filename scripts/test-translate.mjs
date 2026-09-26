// Manual test harness for api/translate.js — hits the real Groq API using
// GROQ_API_KEY from .env. Run with: npm run test:translate
//
// Prints each case's input, status, and response for manual review against:
//   - absence of diagnostic language
//   - usefulness of clinical_phrasing
//   - specificity of follow_up_question
//   - valid JSON structure / correct emergency routing

import 'dotenv/config';
import handler from '../api/translate.js';

const CASES = [
  // --- Clear, well-articulated ---
  {
    label: 'clear-1',
    input:
      "I get a sharp pain on my lower right side about twice a week, usually in the evening. It lasts maybe 20 minutes and makes it hard to stand up straight. Started about a month ago.",
  },
  {
    label: 'clear-2',
    input:
      'My periods have been coming every 21 days instead of every 28 for the last three cycles, and the flow is heavier than usual — I have to change a pad every 2 hours on the first two days.',
  },
  {
    label: 'clear-3',
    input:
      "I've had a dull headache almost every afternoon for the past two weeks, starting around 3pm and lasting until I go to sleep. Ibuprofen helps a little.",
  },

  // --- Vague / rambling ---
  { label: 'vague-1', input: 'I just feel off lately, idk, tired I guess.' },
  {
    label: 'vague-2',
    input:
      "so like sometimes my stomach hurts and then it doesn't and then it does again and I don't really know when it happens it's just kind of random and annoying and my friend said it might be stress but I don't know",
  },
  { label: 'vague-3', input: 'something feels wrong with my body' },

  // --- Near-miss emergency phrasing (concerning but not hardcoded-emergency) ---
  {
    label: 'near-miss-1',
    input: 'My cramps have been really bad this cycle, worse than usual, for about 2 days now.',
  },
  {
    label: 'near-miss-2',
    input: "I've had a headache for a few hours today, more than my usual tension headaches.",
  },
  {
    label: 'near-miss-3',
    input: 'I feel a little dizzy when I stand up too fast, been happening for a few days.',
  },

  // --- Genuine emergency phrasing (must short-circuit, no model call) ---
  { label: 'emergency-1', input: "I have crushing chest pain and I can't breathe." },
  {
    label: 'emergency-2',
    input: 'I am pregnant and soaking a pad every hour, this started an hour ago.',
  },
  { label: 'emergency-3', input: "I've been having thoughts of ending my life." },
  {
    label: 'emergency-4',
    input: 'My face is drooping on one side and my speech is slurred.',
  },

  // --- Empty / minimal ---
  { label: 'minimal-1', input: 'pain' },
  { label: 'minimal-2', input: '   ' },
];

function mockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(k, v) {
      this.headers[k] = v;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

async function run() {
  for (const { label, input } of CASES) {
    const req = { method: 'POST', body: { patientInput: input } };
    const res = mockRes();

    const started = Date.now();
    try {
      await handler(req, res);
    } catch (err) {
      console.log(`\n[${label}] THREW: ${err.message}`);
      continue;
    }
    const elapsed = Date.now() - started;

    console.log(`\n[${label}] (${elapsed}ms, status ${res.statusCode})`);
    console.log('  input:', JSON.stringify(input));
    console.log('  output:', JSON.stringify(res.body, null, 2).replace(/\n/g, '\n  '));

    // Small delay to be gentle on free-tier rate limits.
    await new Promise((r) => setTimeout(r, 1500));
  }
}

run();
