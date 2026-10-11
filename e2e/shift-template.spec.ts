// 班別設定 (/templates)
import { test, expect, modal, field, row } from './support/fixtures';
import { PREFIX } from './support/db';

const ID = `${PREFIX}T1`;

test.describe('班別設定', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/templates');
    await expect(page.getByRole('heading', { name: '班別設定' })).toBeVisible();
  });

  test('新增、編輯、停用班別', async ({ page, alerts }) => {
    // 新增
    await page.getByRole('button', { name: '+ 新增班別' }).click();
    const m = modal(page);
    await expect(m.getByRole('heading', { name: '新增班別' })).toBeVisible();
    await field(m, '班別代碼').fill(ID);
    await field(m, '班別名稱').fill('PW早班');
    await field(m, '上班時間').fill('08:30');
    await field(m, '下班時間').fill('17:30');
    await m.getByRole('button', { name: '確認儲存' }).click();
    await expect(m).toBeHidden();

    const r = row(page, ID);
    await expect(r).toContainText('PW早班');
    await expect(r).toContainText('08:30 - 17:30');
    await expect(r).toContainText('啟用中');

    // 編輯：代碼不可修改，改為跨日班
    await r.getByRole('button', { name: '編輯' }).click();
    await expect(field(m, '班別代碼')).toBeDisabled();
    await expect(field(m, '班別代碼')).toHaveValue(ID);
    await expect(field(m, '上班時間')).toHaveValue('08:30');
    await field(m, '班別名稱').fill('PW早班(改)');
    await field(m, '上班時間').fill('22:00');
    await field(m, '下班時間').fill('06:00');
    await m.getByLabel('跨日班 (下班時間為隔日)').check();
    await m.getByRole('button', { name: '確認儲存' }).click();
    await expect(m).toBeHidden();

    await expect(r).toContainText('PW早班(改)');
    await expect(r).toContainText('22:00 - 隔日 06:00');
    await expect(r).toContainText('跨日');

    // 停用
    await r.getByRole('button', { name: '編輯' }).click();
    await m.getByLabel('啟用此班別').uncheck();
    await m.getByRole('button', { name: '確認儲存' }).click();
    await expect(m).toBeHidden();
    await expect(r).toContainText('已停用');

    expect(alerts).toEqual([]);
  });

  test('代碼重複時顯示錯誤且不關閉視窗', async ({ page, alerts }) => {
    await page.getByRole('button', { name: '+ 新增班別' }).click();
    const m = modal(page);
    await field(m, '班別代碼').fill(`${PREFIX}DAY`); // 已由 global-setup 建立
    await field(m, '班別名稱').fill('重複班別');
    await m.getByRole('button', { name: '確認儲存' }).click();

    await expect.poll(() => alerts.at(-1)).toContain('已存在');
    await expect(m).toBeVisible();
  });

  test('必填欄位檢查', async ({ page, alerts }) => {
    await page.getByRole('button', { name: '+ 新增班別' }).click();
    await modal(page).getByRole('button', { name: '確認儲存' }).click();
    await expect.poll(() => alerts.at(-1)).toBe('請輸入班別代碼');
  });
});
