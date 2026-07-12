import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 180_000,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    trace: 'on-first-retry',
    permissions: ['camera'],
  },
  projects: [{
    name: 'chromium',
    use: {
      ...devices['Desktop Chrome'],
      launchOptions: {
        args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
      },
    },
  }],
  webServer: process.env.CI
    ? undefined
    : [
        {
          command: 'npm run dev:api',
          cwd: '.',
          port: 3001,
          reuseExistingServer: true,
          timeout: 120_000,
        },
        {
          command: 'npm run dev',
          cwd: '.',
          port: 5173,
          reuseExistingServer: true,
          timeout: 120_000,
        },
      ],
});
