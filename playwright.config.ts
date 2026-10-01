import { defineConfig, devices } from '@playwright/test'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  testDir: fileURLToPath(new URL('./tests', import.meta.url)),
  outputDir: fileURLToPath(new URL('./test-results', import.meta.url)),
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5196',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    cwd: fileURLToPath(new URL('.', import.meta.url)),
    command: 'npm run preview -- --port 5196',
    url: 'http://127.0.0.1:5196',
    reuseExistingServer: false,
    timeout: 30_000,
  },
})
