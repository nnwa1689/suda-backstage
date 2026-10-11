// 測試開始前：清除上次殘留並建立基礎測試資料
import { cleanupTestData, seedTestData } from './support/db';

export default async function globalSetup() {
  if (!process.env.E2E_USERNAME || !process.env.E2E_PASSWORD) {
    throw new Error('請設定 E2E_USERNAME 與 E2E_PASSWORD 環境變數 (需為管理員帳號)');
  }
  await cleanupTestData();
  await seedTestData();
}
