const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['html'], ['list']],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testMatch: '**/e2e/*.spec.js',
    },
  ],

  // Webサーバーの自動起動は無効化（既に起動している前提）
  // webServer: [
  //   {
  //     command: 'npm run dev',
  //     port: 3000,
  //     cwd: './frontend',
  //     reuseExistingServer: !process.env.CI,
  //   },
  //   {
  //     command: 'npm run start:dev',
  //     port: 3002,
  //     cwd: './backend',
  //     reuseExistingServer: !process.env.CI,
  //   },
  // ],
});