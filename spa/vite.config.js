import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import legacy from '@vitejs/plugin-legacy'

export default defineConfig({
  plugins: [
    react(),
    // Generate legacy bundle for older Safari/Android WebView to avoid
    // unsupported RegExp features (e.g., named capture groups / lookbehind)
    legacy({
      targets: [
        'defaults',
        'not IE 11',
        'Safari >= 12',
        'iOS >= 12',
        'Android >= 7'
      ],
      modernPolyfills: true
    })
  ],
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
    copyPublicDir: true,
    // Ensure transforms/polyfills for legacy output
    target: 'es2018'
  },
  esbuild: {
    jsx: 'automatic'
  }
})
