import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  envPrefix: ['VITE_', 'SUPABASE_', 'APP_'],
  plugins: [react(), tailwindcss()],
})
