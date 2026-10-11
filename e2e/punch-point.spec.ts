// 打卡點設定 (/locations)
import { test, expect, modal, field, row } from './support/fixtures';
import { PREFIX } from './support/db';

const ID = `${PREFIX}P1`;

test.describe('打卡點設定', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/locations');
    await expect(page.getByRole('heading', { name: '打卡點設定' })).toBeVisible();
  });

  test('新增、搜尋、編輯為 WiFi 驗證、停用與重新啟用', async ({ page, alerts }) => {
    // 新增 GPS 打卡點
    await page.getByRole('button', { name: '+ 新增打卡點' }).click();
    const m = modal(page);
    await field(m, '代碼').fill(ID);
    await field(m, '名稱').fill('PW測試據點');
    await field(m, '驗證方式').selectOption('GPS');
    await m.getByPlaceholder('緯度').fill('25.033964');
    await m.getByPlaceholder('經度').fill('121.564468');
    await m.getByPlaceholder('半徑 (公尺)').fill('120');
    await m.getByRole('button', { name: '確認儲存' }).click();
    await expect(m).toBeHidden();

    const r = row(page, ID);
    await expect(r).toContainText('PW測試據點');
    await expect(r).toContainText('GPS 座標');
    await expect(r).toContainText('25.033964, 121.564468');
    await expect(r).toContainText('半徑 120 公尺');
    await expect(r).toContainText('啟用中');

    // 搜尋
    await page.getByPlaceholder('搜尋代碼或名稱').fill(ID);
    await page.getByRole('button', { name: '搜尋' }).click();
    await expect(page.locator('tbody tr')).toHaveCount(1);

    // 編輯為 WiFi 驗證：既有座標應帶入
    await r.getByRole('button', { name: '編輯' }).click();
    await expect(field(m, '代碼')).toBeDisabled();
    await expect(m.getByPlaceholder('緯度')).toHaveValue('25.033964');
    await field(m, '驗證方式').selectOption('WIFI');
    await field(m, 'WiFi SSID').fill('SUDA-OFFICE');
    await field(m, 'BSSID 白名單').fill('aa:bb:cc:dd:ee:01\naa:bb:cc:dd:ee:02');
    await m.getByRole('button', { name: '確認儲存' }).click();
    await expect(m).toBeHidden();

    await expect(r).toContainText('WiFi');
    await expect(r).toContainText('SUDA-OFFICE');
    await expect(r).toContainText('2 組 BSSID');
    await expect(r).toContainText('25.033964, 121.564468');

    // 刪除 (軟刪除：停用)
    await r.getByRole('button', { name: '刪除 (停用)' }).click();
    await expect(r).toContainText('已停用');

    // 重新啟用
    await r.getByRole('button', { name: '重新啟用' }).click();
    await expect(r).toContainText('啟用中');

    expect(alerts).toEqual([]);
  });

  test('WiFi 驗證缺少 BSSID 時阻擋儲存', async ({ page, alerts }) => {
    await page.getByRole('button', { name: '+ 新增打卡點' }).click();
    const m = modal(page);
    await field(m, '代碼').fill(`${PREFIX}P2`);
    await field(m, '名稱').fill('PW WiFi 據點');
    await field(m, '驗證方式').selectOption('WIFI');
    await m.getByPlaceholder('緯度').fill('25.0');
    await m.getByPlaceholder('經度').fill('121.5');
    await field(m, 'WiFi SSID').fill('SUDA-OFFICE');
    await m.getByRole('button', { name: '確認儲存' }).click();

    await expect.poll(() => alerts.at(-1)).toBe('WiFi 驗證需設定 SSID 與至少一個 BSSID');
    await expect(m).toBeVisible();
  });

  test('座標超出範圍時阻擋儲存', async ({ page, alerts }) => {
    await page.getByRole('button', { name: '+ 新增打卡點' }).click();
    const m = modal(page);
    await field(m, '代碼').fill(`${PREFIX}P3`);
    await field(m, '名稱').fill('PW 錯誤座標');
    await m.getByPlaceholder('緯度').fill('95');
    await m.getByPlaceholder('經度').fill('121.5');
    await m.getByRole('button', { name: '確認儲存' }).click();

    await expect.poll(() => alerts.at(-1)).toBe('緯度需介於 -90 ~ 90');
  });
});
