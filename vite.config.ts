import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
// For GitHub Pages: set base to '/repo-name/' (replace 'repo-name' with your actual repo name)
// For root domain (username.github.io): use base: '/' or omit
// This can also be set via environment variable: BASE_PATH=/repo-name/ npm run build
export default defineConfig({
  plugins: [react()],
  base: process.env.BASE_PATH || '/',
})
