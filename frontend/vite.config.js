import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8000',
      '/agent2': 'http://127.0.0.1:8000',
      '/agent3': 'http://127.0.0.1:8000',
    }
  },
  build: {
    outDir: 'dist',
  }
})
