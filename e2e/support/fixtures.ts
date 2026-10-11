// 共用 fixture 與工具
import { test as base, expect, type Locator, type Page } from '@playwright/test';

type Fixtures = {
  // 頁面上出現過的 alert 訊息 (confirm 一律自動確認)
  alerts: string[];
};

export const test = base.extend<Fixtures>({
  // auto：未使用 alerts 的測試也要註冊，否則 Playwright 預設會取消 confirm
  alerts: [
    async ({ page }, use) => {
      const alerts: string[] = [];
      page.on('dialog', async (dialog) => {
        if (dialog.type() === 'alert') alerts.push(dialog.message());
        await dialog.accept();
      });
      await use(alerts);
    },
    { auto: true },
  ],
});

export { expect };

// 新增 / 編輯視窗
export const modal = (page: Page) => page.locator('div.fixed.inset-0');

// 依標籤文字取得表單欄位 (標籤與欄位為同一個 div 的直接子元素)
export const field = (scope: Page | Locator, label: string) =>
  scope.locator(`div:has(> label:text-is("${label}")) > :is(input, select, textarea)`);

// 取得包含指定文字的表格列
export const row = (page: Page, text: string) => page.locator('tbody tr', { hasText: text });
