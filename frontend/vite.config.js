import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/analizar": "http://localhost:8001",
      "/salud":    "http://localhost:8001",
    },
  },
})
