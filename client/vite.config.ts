import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@shared': new URL('../shared', import.meta.url).pathname },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
      '/ws': {
        target: 'ws://localhost:3001',
        ws: true,
        // Without an error handler the dev proxy wedges permanently after a
        // backend restart and every reconnect fails; swallowing the error
        // lets the client's backoff (S8) find the recovered server.
        configure: (proxy) => {
          proxy.on('error', () => {});
        },
      },
    },
  },
});
