import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/browser',
  outputDir: 'test-results/browser',
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  workers: 1,
  use: {
    baseURL: process.env.LWE_BROWSER_URL,
    browserName: 'chromium',
    viewport: { width: 1280, height: 800 },
    screenshot: 'on',
    trace: 'on',
    video: 'retain-on-failure',
  },
})
