import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import legacy from '@vitejs/plugin-legacy';

export default defineConfig({
  plugins: [
    react(),
    // Generate a legacy bundle for older Safari/Android WebView to avoid
    // regex feature gaps (e.g., named capturing groups).
    legacy({
      targets: [
        'defaults',
        'not IE 11',
        'Safari >= 12',
        'iOS >= 12',
        'Android >= 7'
      ],
      // Modern + legacy builds; inject necessary polyfills.
      modernPolyfills: true
    })
  ],
  root: '.',
  base: '/',
  assetsInclude: [
    '**/*.md'
  ],
  server: {
    port: 5174,
    proxy: {
      '/api': 'http://backend:8000',
      '/static': 'http://backend:8000'
    }
  },
  resolve: {
    alias: {
      '@components': path.resolve(__dirname, 'src/components'),
      '@pages': path.resolve(__dirname, 'src/pages'),
      '@features': path.resolve(__dirname, 'src/features'),
      '@hooks': path.resolve(__dirname, 'src/hooks'),
      '@services': path.resolve(__dirname, 'src/services'),
      '@styles': path.resolve(__dirname, 'src/styles'),
      '@utils': path.resolve(__dirname, 'src/utils')
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    emptyOutDir: true,
    // Lower target to allow transforms/polyfills in legacy build
    target: 'es2018'
  }
});

