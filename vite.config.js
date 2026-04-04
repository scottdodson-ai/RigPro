import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3000,
    allowedHosts: ['www.rigpro3.com', 'rigpro3.com'],
    proxy: {
      '/api': {
        target: 'http://api:3001',
        changeOrigin: true,
      },
    },
  },
})
