import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { localDataPlugin } from './dev/local-data'

export default defineConfig({
  plugins: [
    react(),
    localDataPlugin(fileURLToPath(new URL('../wellnote-personal-data.json', import.meta.url))),
    {
      name: 'production-local-data-csp',
      apply: 'build',
      transformIndexHtml() {
        return [{
          tag: 'meta',
          attrs: {
            'http-equiv': 'Content-Security-Policy',
            content: "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob:; connect-src 'none'; object-src 'none'; base-uri 'self'; form-action 'none'",
          },
          injectTo: 'head-prepend',
        }]
      },
    },
  ],
  base: './',
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    cors: false,
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
    cors: false,
  },
  build: { assetsInlineLimit: 0 },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'dev/**/*.test.ts'],
  },
})
