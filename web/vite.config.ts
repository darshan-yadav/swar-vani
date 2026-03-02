import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
  define: {
    // Ensure 'global' is available for amazon-cognito-identity-js
    global: 'globalThis',
  },
  resolve: {
    alias: {
      // Ensure buffer polyfill resolves correctly
      buffer: 'buffer',
    },
  },
  optimizeDeps: {
    include: ['buffer', 'amazon-cognito-identity-js'],
  },
})
