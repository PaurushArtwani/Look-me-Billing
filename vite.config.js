import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/Look-me-Billing/',   // GitHub Pages repo name
  plugins: [react()],
  server: {
    headers: {
      'Cache-Control': 'no-store',
    },
  },
  build: {
    rollupOptions: {
      output: {
        entryFileNames:   'assets/[name].[hash].js',
        chunkFileNames:   'assets/[name].[hash].js',
        assetFileNames:   'assets/[name].[hash].[ext]',
      },
    },
  },
})
