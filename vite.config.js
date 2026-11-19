import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      // Prevent browser from caching pages in dev
      'Cache-Control': 'no-store',
    },
  },
  build: {
    // Add content hash to filenames so browser always loads fresh files after deploy
    rollupOptions: {
      output: {
        entryFileNames:   'assets/[name].[hash].js',
        chunkFileNames:   'assets/[name].[hash].js',
        assetFileNames:   'assets/[name].[hash].[ext]',
      },
    },
  },
})
