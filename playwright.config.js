// Playwright config for MAHP's manual QA/visual tests (Fase 2).
// This config — and Node/npm — exist only to run tests locally.
// The shipped app is still plain HTML/JS, no bundler (ADR-003).
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  retries: 0,
  reporter: [['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:8765',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'python -m http.server 8765',
    url: 'http://localhost:8765/login.html',
    reuseExistingServer: true,
    timeout: 30000,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'tablet', use: { ...devices['iPad Mini'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'] } },
  ],
});
