import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: 'output/playwright/report', open: 'never' }]],
  outputDir: 'output/playwright/results',
  use: {
    baseURL: 'http://127.0.0.1:19006',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...devices['Desktop Chrome'],
    viewport: { width: 390, height: 844 },
  },
  webServer: {
    command: 'npx expo start --web --port 19006',
    url: 'http://127.0.0.1:19006',
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      CI: '1',
      EXPO_PUBLIC_API_URL: 'http://127.0.0.1:9999/api/v1',
    },
  },
});
