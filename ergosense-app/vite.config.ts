import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'icon.svg',
        'favicon.ico',
        'favicon-32.png',
        'apple-touch-icon.png',
        'ergosense-192.png',
        'ergosense-48.png',
        'ergosense-512.png',
        'ergosense-512-maskable.png',
      ],
      manifest: {
        name: 'ErgoSense AI',
        short_name: 'ErgoSense',
        description: 'Análise ergonômica industrial com IA — mobile first, funciona offline.',
        lang: 'pt-BR',
        dir: 'ltr',
        start_url: '/?source=pwa',
        scope: '/',
        // id novo força o Windows/Chrome a buscar ícones de novo (sem cruz em cache)
        id: '/ergosense-app-v2',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'portrait-primary',
        background_color: '#090c11',
        theme_color: '#090c11',
        categories: ['business', 'productivity', 'health'],
        // Só PNG — Windows atalho de área de trabalho ignora/quebra SVG
        icons: [
          {
            src: 'ergosense-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'ergosense-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'ergosense-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Modelos ONNX/WASM ficam grandes — app shell + JS/CSS/HTML
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webp}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/form\//],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 16, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // API sempre na rede — nunca cache (POST/autônomo/login quebram com NetworkFirst)
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly',
            method: 'GET',
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly',
            method: 'POST',
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly',
            method: 'PUT',
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly',
            method: 'PATCH',
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly',
            method: 'DELETE',
          },
        ],
      },      devOptions: {
        // Permite instalar/testar PWA também no npm run dev (localhost)
        enabled: true,
        type: 'module',
      },
    }),
  ],
  server: {
    // Portas fixas — nunca pular para 5174/5175
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        // Geração AET/relatórios IA pode levar 1–3 min
        timeout: 300_000,
        proxyTimeout: 300_000,
      },
    },
  },
  preview: {
    port: 5173,
    strictPort: true,
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/onnxruntime-web')) return 'onnx'
          if (id.includes('@mediapipe')) return 'mediapipe'
          if (id.includes('node_modules/jspdf')) return 'pdf'
          if (id.includes('node_modules/html2canvas')) return 'canvas'
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) return 'react-vendor'
          if (id.includes('node_modules/qrcode')) return 'qrcode'
        },
      },
    },
  },
})
