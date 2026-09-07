import path from 'node:path'
import {fileURLToPath} from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import {defineConfig, loadEnv} from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({mode}) => {
  const rawEnv = loadEnv(mode, __dirname, '')
  // Same convention as frontend-diagnostica: behind the HTTPS dev proxy the HMR
  // websocket must go through wss://<host>:443 instead of ws://<host>:3200.
  const hmr = rawEnv.VITE_HMR_PROXY === 'true' ? {protocol: 'wss' as const, clientPort: 443} : true

  return {
    plugins: [tailwindcss(), react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      // 3000 = cabina/multi, 3100 = frontend-diagnostica.
      port: 3200,
      host: true,
      strictPort: true,
      allowedHosts: ['.diagnostica.com.ar', 'localhost'],
      hmr,
    },
    build: {
      outDir: 'build', // matches the other frontends (and their Dockerfiles)
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/setupTests.ts',
      css: false,
    },
  }
})
