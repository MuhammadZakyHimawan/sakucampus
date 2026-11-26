import process from 'node:process';

import { defineConfig, devices } from '@playwright/test';

import { getE2eEnv } from './e2e/env';

const e2eEnv = getE2eEnv();

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  timeout: 60_000,
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'uv run uvicorn app.main:app --host 127.0.0.1 --port 8000',
      cwd: '../backend',
      env: e2eEnv,
      url: 'http://127.0.0.1:8000/health/live',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 5173',
      cwd: '.',
      env: {
        VITE_API_BASE_URL: 'http://127.0.0.1:8000/api/v1',
        VITE_USE_MOCK_API: 'false',
      },
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
