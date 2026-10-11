// 測試結束後：清除所有 PWE2E_ 測試資料
import { cleanupTestData } from './support/db';

export default async function globalTeardown() {
  await cleanupTestData();
}
