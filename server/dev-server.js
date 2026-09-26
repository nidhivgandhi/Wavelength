// Local-only dev server for the /api/* serverless functions.
//
// `npm run dev` (Vite) has no idea api/translate.js exists — that file is a
// Vercel serverless function, and Vite's dev server doesn't run those. This
// wraps the exact same handler in a plain Express route so it can be run
// locally without the Vercel CLI/account. Vite proxies /api/* to this
// server (see vite.config.js), so `npm run dev` alone serves both.
//
// This file is NOT what runs in production — Vercel runs api/translate.js
// directly as a serverless function there. This only exists to make local
// dev friction-free.

import 'dotenv/config';
import express from 'express';
import translateHandler from '../api/translate.js';

const app = express();
app.use(express.json());

app.post('/api/translate', (req, res) => translateHandler(req, res));

const PORT = process.env.API_PORT || 3001;
app.listen(PORT, () => {
  console.log(`[dev-api] Local /api/* server running on http://localhost:${PORT}`);
  if (!process.env.GROQ_API_KEY) {
    console.warn('[dev-api] WARNING: GROQ_API_KEY is not set — copy .env.example to .env and fill it in.');
  }
});
