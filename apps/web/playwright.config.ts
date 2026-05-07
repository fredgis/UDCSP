import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e-placeholder',
  fullyParallel: true,
  use: { baseURL: 'http://127.0.0.1:5173', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium-a11y-smoke', use: { ...devices['Desktop Chrome'] } }],
});
