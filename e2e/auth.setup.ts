// 以管理員帳號透過登入頁登入，並保存登入狀態 (localStorage token) 供其他測試共用
import { test as setup, expect } from '@playwright/test';
import { AUTH_FILE } from '../playwright.config';

setup('管理員登入', async ({ page }) => {
  await page.goto('/login');
  await page.getByPlaceholder('ID').fill(process.env.E2E_USERNAME!);
  await page.getByPlaceholder('••••••••').fill(process.env.E2E_PASSWORD!);
  await page.locator('button[type="submit"]').click();

  await expect(page).toHaveURL('/');
  await expect(page.getByText('你好，管理員')).toBeVisible();
  await page.context().storageState({ path: AUTH_FILE });
});
