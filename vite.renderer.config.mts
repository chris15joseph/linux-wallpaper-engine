import { defineConfig } from 'vite-plus'
import react from '@vitejs/plugin-react'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { DEV_BACKEND_PORT } from './src/shared/constants/development.ts'

// https://vitejs.dev/config
export default defineConfig({
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
      routesDirectory: path.resolve(import.meta.dirname, './src/renderer/routes'),
      generatedRouteTree: path.resolve(import.meta.dirname, './src/renderer/routeTree.gen.ts'),
    }),
    react(),
    tailwindcss(),
  ],
  server: {
    watch: { ignored: ['**/.vite/**', '**/out/**'] },
    // Browser tabs reach the dev backend in Electron main (src/main/development/gateway.ts)
    proxy: { '/api': { target: `http://127.0.0.1:${DEV_BACKEND_PORT}`, ws: true } },
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src/renderer'),
      '~': path.resolve(import.meta.dirname, './src/renderer'),
    },
  },
})
