// Playwright 後台 UI e2e 測試設定
// 執行：E2E_USERNAME=<管理員帳號> E2E_PASSWORD=<密碼> npm run test:e2e
// 會自動啟動 suda-punch-api (start:dev, :3000) 與 Vite (:5173)；已在執行中則直接沿用
// 測試資料以 PWE2E_ 前綴直接寫入 suda-punch-api 的開發資料庫，結束後自動清除
import { defineConfig, devices } from '@playwright/test';

export const AUTH_FILE = 'e2e/.auth/admin.json';

export default defineConfig({
  testDir: './e2e',
  // 測試共用同一個資料庫，依序執行避免互相干擾
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  use: {
    baseURL: 'http://localhost:5173',
    locale: 'zh-TW',
    timezoneId: 'Asia/Taipei',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: AUTH_FILE },
      dependencies: ['setup'],
    },
  ],
  webServer: [
    {
      command: 'npm run start:dev',
      cwd: '../suda-punch-api',
      url: 'http://localhost:3000',
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
});
