import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/external-api': {
        target: 'https://testenvapi.lifo.ly',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/external-api/, '/api'),
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
      },
      '/lifo-prod': {
        target: 'https://prod.lifo.ly',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/lifo-prod/, ''),
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('lifo-prod proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to lifo-prod:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from lifo-prod:', proxyRes.statusCode, req.url);
          });
        },
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // فصل React و React-DOM
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'react-vendor';
          }
          // فصل React Router
          if (id.includes('node_modules/react-router')) {
            return 'router-vendor';
          }
          // فصل باقي node_modules
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
})


