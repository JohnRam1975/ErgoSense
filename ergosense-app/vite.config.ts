import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
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
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/onnxruntime-web')) return 'onnx';
          if (id.includes('@mediapipe')) return 'mediapipe';
          if (id.includes('node_modules/jspdf')) return 'pdf';
          if (id.includes('node_modules/html2canvas')) return 'canvas';
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) return 'react-vendor';
          if (id.includes('node_modules/qrcode')) return 'qrcode';
        },
      },
    },
  },
})
