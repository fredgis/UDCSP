// TODO: case-study scaffold. Wire to deployed A9/A10/A16 environments.
import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests', timeout: 60000, fullyParallel: true,
  reporter: [['html', { outputFolder: 'playwright-report' }], ['json', { outputFile: 'results/e2e-results.json' }]],
  use: { baseURL: process.env.UDCSP_WEB_BASE_URL ?? 'https://localhost:5173', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 15'] } },
    { name: 'a11y', use: { ...devices['Desktop Chrome'] }, grep: /@a11y/ }
  ]
});
