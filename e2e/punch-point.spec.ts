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

  test('新增藍牙打卡點、格式檢查、切換為 GPS 後清除 UUID', async ({ page, alerts }) => {
    const id = `${PREFIX}BT`;
    const uuid = 'E2C56DB5-DFFB-48D2-B060-D0F5A71096E0';
    await page.getByRole('button', { name: '+ 新增打卡點' }).click();
    const m = modal(page);
    await field(m, '代碼').fill(id);
    await field(m, '名稱').fill('PW藍牙據點');
    await field(m, '驗證方式').selectOption('Bluetooth');
    await m.getByPlaceholder('緯度').fill('25.033964');
    await m.getByPlaceholder('經度').fill('121.564468');

    // 未填 UUID
    await m.getByRole('button', { name: '確認儲存' }).click();
    await expect.poll(() => alerts.at(-1)).toBe('藍牙驗證需設定 Service UUID');
    // 格式錯誤 (iOS 解析失敗會閃退，須於前端擋下)
    await field(m, '藍牙 Service UUID').fill('not-a-uuid');
    await m.getByRole('button', { name: '確認儲存' }).click();
    await expect.poll(() => alerts.at(-1)).toBe('藍牙 Service UUID 格式錯誤，需為 4 碼、8 碼或標準 UUID');

    await field(m, '藍牙 Service UUID').fill(uuid);
    await m.getByRole('button', { name: '確認儲存' }).click();
    await expect(m).toBeHidden();

    const r = row(page, id);
    await expect(r).toContainText('藍牙');
    await expect(r).toContainText(uuid);

    // 編輯時帶入 UUID；切換為 GPS 後清除
    await r.getByRole('button', { name: '編輯' }).click();
    await expect(field(m, '驗證方式')).toHaveValue('Bluetooth');
    await expect(field(m, '藍牙 Service UUID')).toHaveValue(uuid);
    await field(m, '驗證方式').selectOption('GPS');
    await expect(field(m, '藍牙 Service UUID')).toHaveCount(0);
    await m.getByRole('button', { name: '確認儲存' }).click();
    await expect(m).toBeHidden();
    await expect(r).toContainText('GPS 座標');
    await expect(r).not.toContainText(uuid);
    expect(alerts).toHaveLength(2);
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
