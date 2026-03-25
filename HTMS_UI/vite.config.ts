import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Path alias @/ → src/
      // Khớp với "paths": { "@/*": ["./src/*"] } trong tsconfig.app.json
      "@": path.resolve(__dirname, "./src"),
    },
  },
})