// 個別排班 (/schedules)
import { test, expect, modal, field, row } from './support/fixtures';
import { SEED } from './support/db';

const MONTH = '2099-01'; // 遠期月份，避免影響實際排班

test.describe('個別排班', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/schedules');
    await expect(page.getByRole('heading', { name: '個別排班' })).toBeVisible();
  });

  test('員工清單可依關鍵字與部門篩選', async ({ page }) => {
    const list = page.locator('ul');
    await page.getByPlaceholder('搜尋姓名或員工編號').fill('PWE2E_');
    await expect(list.locator('li')).toHaveCount(2);

    await page.locator('select').first().selectOption(SEED.deptB.id);
    await expect(list.locator('li')).toHaveCount(1);
    await expect(list).toContainText(SEED.emp2.name);

    await page.getByPlaceholder('搜尋姓名或員工編號').fill('不存在的員工');
    await expect(list).toContainText('查無員工');
  });

  test('新增、編輯、刪除員工排班', async ({ page, alerts }) => {
    await page.getByPlaceholder('搜尋姓名或員工編號').fill(SEED.emp1.id);
    await page.getByRole('button', { name: SEED.emp1.name }).click();
    await expect(page.getByRole('heading', { name: `${SEED.emp1.name} 的班表` })).toBeVisible();

    await page.locator('input[type="month"]').fill(MONTH);
    await expect(page.getByText('本月尚無排班。')).toBeVisible();

    const m = modal(page);
    const templateLabel = `${SEED.template.name} (09:00 - 18:00)`;

    // 新增每日排班
    await page.getByRole('button', { name: '+ 新增排班' }).click();
    await field(m, '排班類型').selectOption('daily');
    await field(m, '排班日期').fill(`${MONTH}-10`);
    await field(m, '班別').selectOption(SEED.template.id);
    await m.getByRole('button', { name: '確認儲存' }).click();
    await expect(m).toBeHidden();

    const daily = row(page, `${MONTH}-10`);
    await expect(daily).toContainText('每日');
    await expect(daily).toContainText(templateLabel);

    // 新增固定 (循環) 排班
    await page.getByRole('button', { name: '+ 新增排班' }).click();
    await field(m, '排班類型').selectOption('fixed');
    await field(m, '排班月份').fill(MONTH);
    await field(m, '班別').selectOption(SEED.template.id);
    await m.getByRole('button', { name: '確認儲存' }).click();
    await expect(m).toBeHidden();

    const fixed = row(page, `${MONTH} 整月`);
    await expect(fixed).toContainText('固定');
    // 固定排班排在最前面
    await expect(page.locator('tbody tr').first()).toContainText(`${MONTH} 整月`);

    // 同月重複新增固定排班 → 後端拒絕
    await page.getByRole('button', { name: '+ 新增排班' }).click();
    await field(m, '排班類型').selectOption('fixed');
    await field(m, '排班月份').fill(MONTH);
    await m.getByRole('button', { name: '確認儲存' }).click();
    await expect.poll(() => alerts.at(-1)).toContain('已有 固定 排班記錄');
    await m.getByRole('button', { name: '取消' }).click();

    // 編輯每日排班日期
    await daily.getByRole('button', { name: '編輯' }).click();
    await expect(field(m, '排班日期')).toHaveValue(`${MONTH}-10`);
    await field(m, '排班日期').fill(`${MONTH}-12`);
    await m.getByRole('button', { name: '確認儲存' }).click();
    await expect(m).toBeHidden();
    await expect(row(page, `${MONTH}-12`)).toContainText(templateLabel);
    await expect(row(page, `${MONTH}-10`)).toHaveCount(0);

    // 刪除
    await row(page, `${MONTH}-12`).getByRole('button', { name: '刪除' }).click();
    await expect(row(page, `${MONTH}-12`)).toHaveCount(0);
    await fixed.getByRole('button', { name: '刪除' }).click();
    await expect(page.getByText('本月尚無排班。')).toBeVisible();

    expect(alerts).toHaveLength(1);
  });
});
