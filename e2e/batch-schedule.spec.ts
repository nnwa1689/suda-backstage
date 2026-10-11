// 批次排班 (/batchschedules)：月曆式班表匯入
import { test, expect } from './support/fixtures';
import { SEED, countSchedules } from './support/db';

const MONTH = '2099-02'; // 28 天
const MONTH_START = `${MONTH}-01`;
const MONTH_END = `${MONTH}-28`;
const DAY = SEED.template.id;
const NGT = SEED.nightTemplate.id;

// 一列班表：部門、員工編號、循環班別，後接 1 ~ 31 日
const line = (dept: string, emp: string, cyclic: string, days: Record<number, string> = {}) =>
  [dept, emp, cyclic, ...Array.from({ length: 31 }, (_, i) => days[i + 1] ?? '')].join(',');

const csv = (lines: string[]) => ({
  name: 'schedule.csv',
  mimeType: 'text/csv',
  buffer: Buffer.from(
    '﻿' + ['部門,員工編號,循環班別,' + Array.from({ length: 31 }, (_, i) => i + 1).join(','), ...lines].join('\r\n'),
    'utf-8',
  ),
});

test.describe('批次排班', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/batchschedules');
    await expect(page.getByRole('heading', { name: '批次排班' })).toBeVisible();
    await page.locator('input[type="month"]').fill(MONTH);
  });

  test('下載範本依所選月份產生日期欄位', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: '下載範本' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe(`批次排班範本_${MONTH}.csv`);

    const chunks: Buffer[] = [];
    for await (const chunk of await download.createReadStream()) chunks.push(chunk as Buffer);
    const header = Buffer.concat(chunks).toString('utf-8').replace(/^﻿/, '').split('\n')[0];
    expect(header).toBe('部門,員工編號,循環班別,' + Array.from({ length: 28 }, (_, i) => i + 1).join(','));
  });

  test('欄位數不足時於前端擋下', async ({ page }) => {
    await page.locator('input[type="file"]').setInputFiles(csv([SEED.deptA.id]));
    await expect(page.getByText('第 1 筆欄位數不足')).toBeVisible();
    await expect(page.getByRole('button', { name: '驗證並匯入' })).toBeDisabled();
  });

  test('任一筆資料錯誤時整批不匯入並列出所有錯誤', async ({ page }) => {
    await page.locator('input[type="file"]').setInputFiles(csv([
      line(SEED.deptA.id, SEED.emp1.id, DAY), // 正確
      line('NO_DEPT', SEED.emp2.id, '', { 1: DAY }),
      line(SEED.deptA.id, 'NO_EMP', NGT),
      line(SEED.deptB.id, SEED.emp2.id, '', { 2: 'NO_TPL', 30: DAY }), // 重複、代碼不存在、超出 2 月天數
    ]));

    // 預覽：月曆欄位只到 28 日，並標示超出天數
    await expect(page.getByText('預覽：schedule.csv (共 4 位員工，循環班別 2 位)')).toBeVisible();
    await expect(page.locator('thead th')).toHaveCount(4 + 28 + 1);
    await expect(page.locator('tbody tr').nth(3)).toContainText('(30 日超出本月)');

    await page.getByRole('button', { name: '驗證並匯入' }).click();
    await expect(page.getByText('整批未匯入')).toBeVisible();
    const errors = page.locator('ul li').filter({ hasText: /^第 \d+ 筆/ });
    await expect(errors).toHaveText([
      '第 2 筆：部門 NO_DEPT 不存在。',
      '第 3 筆：員工編號 NO_EMP 不存在。',
      `第 4 筆：員工 ${SEED.emp2.id} 在匯入檔案中重複，每位員工僅能一列。`,
      '第 4 筆：2 日班別代碼 NO_TPL 不存在。',
      `第 4 筆：${MONTH} 只有 28 天，30 日不可填寫班別。`,
    ]);
    expect(await countSchedules(MONTH_START, MONTH_END)).toBe(0);
  });

  test('驗證通過後匯入月曆式班表，重複匯入則整批拒絕', async ({ page }) => {
    const rows = [
      line(SEED.deptA.name, SEED.emp1.id, DAY, { 5: NGT }), // 部門填名稱；整月日班，5 日改夜班
      line(SEED.deptB.id, SEED.emp2.id, '', { 1: DAY, 2: NGT, 4: DAY }), // 逐日排班，3 日休假
    ];
    await page.locator('input[type="file"]').setInputFiles(csv(rows));

    // 預覽：第 3 日員工1 沿用循環班別、員工2 休假；第 5 日員工1 覆寫為夜班
    const emp1 = page.locator('tbody tr').nth(0);
    const emp2 = page.locator('tbody tr').nth(1);
    const dayCell = (row: typeof emp1, day: number) => row.locator('td').nth(3 + day);
    await expect(dayCell(emp1, 3)).toHaveText(DAY);
    await expect(dayCell(emp1, 5)).toHaveText(NGT);
    await expect(dayCell(emp2, 3)).toHaveText('·');
    await expect(emp1).toContainText('1 天');
    await expect(emp2).toContainText('3 天');

    await page.getByRole('button', { name: '驗證並匯入' }).click();
    // 循環 1 筆 + 員工1 逐日 1 筆 + 員工2 逐日 3 筆
    await expect(page.getByText('成功匯入 2 位員工，共 5 筆排班。')).toBeVisible();
    await expect(page.locator('tbody tr')).toHaveCount(0); // 匯入後清空預覽
    expect(await countSchedules(MONTH_START, MONTH_END)).toBe(5);

    // 相同資料再匯入一次 → 與既有排班衝突
    await page.locator('input[type="file"]').setInputFiles(csv(rows));
    await page.getByRole('button', { name: '驗證並匯入' }).click();
    await expect(page.getByText('整批未匯入')).toBeVisible();
    await expect(page.locator('ul li').filter({ hasText: /^第 \d+ 筆/ })).toHaveText([
      `第 1 筆：員工 ${SEED.emp1.id} 在 ${MONTH} 月份已有循環班別排班。`,
      `第 1 筆：員工 ${SEED.emp1.id} 在 5 日已有排班。`,
      `第 2 筆：員工 ${SEED.emp2.id} 在 1、2、4 日已有排班。`,
    ]);
    expect(await countSchedules(MONTH_START, MONTH_END)).toBe(5);
  });
});
