// 打卡紀錄調整 (/punchs)
import { test, expect, modal, field, row } from './support/fixtures';
import { SEED, withDb } from './support/db';

const MONTH = '2099-03';

test.describe('打卡紀錄調整', () => {
  // 員工1 於該月為 PW日班 (09:00 - 18:00) 循環班別，用於驗證遲到 / 早退自動判斷
  test.beforeAll(async () => {
    await withDb((db) =>
      db.query(
        `INSERT INTO employee_schedule (id, employee_id, schedule_date, shift_template_id, schedule_type)
         VALUES (gen_random_uuid(), $1, $2, $3, 'fixed')`,
        [SEED.emp1.id, `${MONTH}-01`, SEED.template.id],
      ),
    );
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/punchs');
    await expect(page.getByRole('heading', { name: '打卡紀錄調整' })).toBeVisible();
    await field(page, '開始日期').fill(`${MONTH}-01`);
    await field(page, '結束日期').fill(`${MONTH}-31`);
    await field(page, '部門').selectOption(SEED.deptA.id);
    await field(page, '員工').selectOption(SEED.emp1.id);
    await page.getByRole('button', { name: '查詢' }).click();
  });

  test('補登、修改、刪除打卡紀錄', async ({ page, alerts }) => {
    await expect(page.getByText('查無打卡紀錄。')).toBeVisible();
    const m = modal(page);

    // 補登上班打卡 09:30 → 依排班判斷遲到
    await page.getByRole('button', { name: '+ 補登打卡' }).click();
    await expect(field(m, '員工')).toHaveValue(SEED.emp1.id); // 帶入篩選中的員工
    await field(m, '打卡時間').fill(`${MONTH}-16T09:30:05`);
    await field(m, '打卡類別').selectOption('CHECK_IN');
    await field(m, '打卡點').selectOption(SEED.punchPoint.id);
    await field(m, '備註').fill('忘記打卡補登');
    await m.getByRole('button', { name: '確認儲存' }).click();
    await expect(m).toBeHidden();

    const r = row(page, SEED.emp1.id);
    await expect(r).toHaveCount(1);
    await expect(r).toContainText('2099/3/16 09:30:05');
    await expect(r).toContainText('上班');
    await expect(r).toContainText('遲到');
    await expect(r).toContainText(SEED.punchPoint.name);
    await expect(r).toContainText('忘記打卡補登');

    // 手動改為未遲到
    await r.getByRole('button', { name: '編輯' }).click();
    await expect(field(m, '遲到')).toHaveValue('true');
    await field(m, '遲到').selectOption('false');
    await m.getByRole('button', { name: '確認儲存' }).click();
    await expect(m).toBeHidden();
    await expect(r).toContainText('準時');

    // 改為下班 17:00，遲到 / 早退交由排班判斷 → 早退
    await r.getByRole('button', { name: '編輯' }).click();
    await field(m, '打卡時間').fill(`${MONTH}-16T17:00:05`);
    await field(m, '打卡類別').selectOption('CHECK_OUT');
    await field(m, '遲到').selectOption('auto');
    await field(m, '早退').selectOption('auto');
    await m.getByRole('button', { name: '確認儲存' }).click();
    await expect(m).toBeHidden();
    await expect(r).toContainText('2099/3/16 17:00:05');
    await expect(r).toContainText('下班');
    await expect(r).toContainText('早退');

    // 刪除
    await r.getByRole('button', { name: '刪除' }).click();
    await expect(page.getByText('查無打卡紀錄。')).toBeVisible();

    expect(alerts).toEqual([]);
  });

  test('必填欄位檢查', async ({ page, alerts }) => {
    await page.getByRole('button', { name: '+ 補登打卡' }).click();
    const m = modal(page);
    await field(m, '打卡時間').fill('');
    await m.getByRole('button', { name: '確認儲存' }).click();
    await expect.poll(() => alerts.at(-1)).toBe('請輸入打卡時間');
    await expect(m).toBeVisible();
  });
});
