import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Local dev note: `npm run dev` only serves the frontend. To exercise the
// /api/* serverless functions locally too, run `vercel dev` instead
// (requires `npm i -g vercel` and `vercel login` once).
export default defineConfig({
  plugins: [react()],
})
