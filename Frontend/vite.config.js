import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true, // Allow external access
    port: 5173,
    strictPort: true,
    allowedHosts: [
      '.ngrok-free.app', // Allow all ngrok free subdomains
      '.ngrok.io',       // Allow all ngrok paid subdomains
    ],
    hmr: {
      clientPort: 443, // Use HTTPS port for HMR through ngrok
    },
  },
})