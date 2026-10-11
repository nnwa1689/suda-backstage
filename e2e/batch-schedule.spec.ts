// 批次排班 (/batchschedules)
import { test, expect } from './support/fixtures';
import { SEED, countSchedules } from './support/db';

const MONTH = '2099-02'; // 28 天
const MONTH_START = `${MONTH}-01`;
const MONTH_END = `${MONTH}-28`;

const csv = (lines: string[]) => ({
  name: 'schedule.csv',
  mimeType: 'text/csv',
  buffer: Buffer.from('﻿' + ['部門,員工編號,班別代碼,是否循環班別', ...lines].join('\r\n'), 'utf-8'),
});

test.describe('批次排班', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/batchschedules');
    await expect(page.getByRole('heading', { name: '批次排班' })).toBeVisible();
    await page.locator('input[type="month"]').fill(MONTH);
  });

  test('下載範本含四個欄位', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: '下載範本' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('批次排班範本.csv');

    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(chunk as Buffer);
    expect(Buffer.concat(chunks).toString('utf-8')).toContain('部門,員工編號,班別代碼,是否循環班別');
  });

  test('欄位數不足時於前端擋下', async ({ page }) => {
    await page.locator('input[type="file"]').setInputFiles(csv([`${SEED.deptA.id},${SEED.emp1.id},${SEED.template.id}`]));
    await expect(page.getByText('第 1 筆欄位數不足')).toBeVisible();
    await expect(page.getByRole('button', { name: '驗證並匯入' })).toBeDisabled();
  });

  test('任一筆資料錯誤時整批不匯入並列出所有錯誤', async ({ page }) => {
    await page.locator('input[type="file"]').setInputFiles(csv([
      `${SEED.deptA.id},${SEED.emp1.id},${SEED.template.id},Y`, // 正確
      `NO_DEPT,${SEED.emp1.id},${SEED.template.id},N`,
      `${SEED.deptA.id},NO_EMP,${SEED.template.id},N`,
      `${SEED.deptA.id},${SEED.emp1.id},NO_TPL,N`,
      `${SEED.deptA.id},${SEED.emp2.id},${SEED.template.id},N`, // 員工不屬於該部門
      `${SEED.deptB.id},${SEED.emp2.id},${SEED.template.id},X`, // 無法辨識
    ]));

    // 預覽
    await expect(page.getByText('預覽：schedule.csv (共 6 筆，循環 1 筆)')).toBeVisible();
    await expect(page.locator('tbody tr').last()).toContainText('無法辨識：X');

    await page.getByRole('button', { name: '驗證並匯入' }).click();
    await expect(page.getByText('資料驗證失敗，共 5 項錯誤，整批未匯入。')).toBeVisible();

    const errors = page.locator('ul li');
    await expect(errors).toHaveText([
      '第 2 筆：部門 NO_DEPT 不存在。',
      '第 3 筆：員工編號 NO_EMP 不存在。',
      '第 4 筆：班別代碼 NO_TPL 不存在。',
      `第 5 筆：員工 ${SEED.emp2.id} 不屬於部門 ${SEED.deptA.id}。`,
      '第 6 筆：是否循環班別「X」無法辨識，請填 Y 或 N。',
    ]);
    expect(await countSchedules(MONTH_START, MONTH_END)).toBe(0);
  });

  test('驗證通過後匯入一個月的班表，重複匯入則整批拒絕', async ({ page }) => {
    const rows = [
      `${SEED.deptA.name},${SEED.emp1.id},${SEED.template.id},Y`, // 部門填名稱、循環班別
      `${SEED.deptB.id},${SEED.emp2.id},${SEED.template.id},否`, // 非循環班別
    ];
    await page.locator('input[type="file"]').setInputFiles(csv(rows));
    await expect(page.locator('tbody tr').first()).toContainText('循環 (整月固定)');
    await expect(page.locator('tbody tr').last()).toContainText('非循環 (每日)');

    await page.getByRole('button', { name: '驗證並匯入' }).click();
    // 循環 1 筆 + 非循環 28 天
    await expect(page.getByText('成功匯入 2 位員工，共 29 筆排班。')).toBeVisible();
    await expect(page.locator('tbody tr')).toHaveCount(0); // 匯入後清空預覽
    expect(await countSchedules(MONTH_START, MONTH_END)).toBe(29);

    // 相同資料再匯入一次 → 與既有排班衝突
    await page.locator('input[type="file"]').setInputFiles(csv(rows));
    await page.getByRole('button', { name: '驗證並匯入' }).click();
    await expect(page.getByText('整批未匯入')).toBeVisible();
    await expect(page.locator('ul li').first()).toContainText(`員工 ${SEED.emp1.id} 在 ${MONTH} 月份已有循環班別排班`);
    expect(await countSchedules(MONTH_START, MONTH_END)).toBe(29);
  });
});
