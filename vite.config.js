import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// `npm run dev` starts this (Vite) alongside server/dev-server.js (a plain
// Express server wrapping the real api/translate.js handler) — see the
// "dev" script in package.json. This proxy sends /api/* requests from the
// browser to that local server so the frontend can call /api/translate
// exactly as it would in production, without needing the Vercel CLI.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
