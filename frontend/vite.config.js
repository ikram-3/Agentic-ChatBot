import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    cors: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      }
    },
  },
  optimizeDeps: {
    include: [
      'react-markdown',
      'style-to-js',
      'property-information',
      'react-syntax-highlighter',
      'react-syntax-highlighter/dist/esm/light',
      'react-syntax-highlighter/dist/esm/styles/hljs/vs2015',
      'react-syntax-highlighter/dist/esm/languages/hljs/javascript',
      'react-syntax-highlighter/dist/esm/languages/hljs/python'
    ],
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
  },
});
