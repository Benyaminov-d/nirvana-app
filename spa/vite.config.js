import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  publicDir: 'public',
  resolve: {
    alias: {
      '@services': resolve(__dirname, 'src/services'),
      '@components': resolve(__dirname, 'src/components'),
      '@pages': resolve(__dirname, 'src/pages'),
      '@assets': resolve(__dirname, 'src/assets'),
      '@styles': resolve(__dirname, 'src/styles'),
      '@context': resolve(__dirname, 'src/context')
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    fs: {
      // Allow serving files from public directory
      allow: ['..', 'public']
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    copyPublicDir: true
  },
  esbuild: {
    jsx: 'automatic'
  }
})
