// e2e 測試資料存取：沿用 suda-punch-api 的 pg 套件與 .env.development 連線設定
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const apiDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../suda-punch-api');
const requireFromApi = createRequire(path.join(apiDir, 'package.json'));
const { Client } = requireFromApi('pg');

// 所有測試資料的代碼前綴
export const PREFIX = 'PWE2E_';

export const SEED = {
  deptA: { id: `${PREFIX}DA`, name: 'PW部門A' },
  deptB: { id: `${PREFIX}DB`, name: 'PW部門B' },
  emp1: { id: `${PREFIX}E1`, name: 'PW員工1' },
  emp2: { id: `${PREFIX}E2`, name: 'PW員工2' },
  template: { id: `${PREFIX}DAY`, name: 'PW日班' }, // 09:00 - 18:00
  punchPoint: { id: `${PREFIX}PP`, name: 'PW據點' },
};

/**
 * 以獨立連線執行 SQL
 */
export async function withDb<T>(fn: (client: any) => Promise<T>): Promise<T> {
  process.loadEnvFile(path.join(apiDir, '.env.development'));
  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

/**
 * 清除所有 PWE2E_ 前綴的測試資料
 */
export async function cleanupTestData() {
  const like = `${PREFIX}%`;
  await withDb(async (db) => {
    await db.query('DELETE FROM punch_logs WHERE employee_id LIKE $1', [like]);
    await db.query('DELETE FROM employee_schedule WHERE employee_id LIKE $1', [like]);
    await db.query('DELETE FROM employees WHERE id LIKE $1', [like]);
    await db.query('DELETE FROM departments WHERE id LIKE $1', [like]);
    await db.query('DELETE FROM shift_templates WHERE id LIKE $1', [like]);
    await db.query('DELETE FROM punch_points WHERE id LIKE $1', [like]);
  });
}

/**
 * 建立各測試共用的基礎資料
 */
export async function seedTestData() {
  await withDb(async (db) => {
    await db.query(
      `INSERT INTO departments (id, name, parent_department_id, is_active) VALUES ($1, $2, '000', true), ($3, $4, '000', true)`,
      [SEED.deptA.id, SEED.deptA.name, SEED.deptB.id, SEED.deptB.name],
    );
    await db.query(
      `INSERT INTO employees (id, name, department_id, is_active) VALUES ($1, $2, $3, true), ($4, $5, $6, true)`,
      [SEED.emp1.id, SEED.emp1.name, SEED.deptA.id, SEED.emp2.id, SEED.emp2.name, SEED.deptB.id],
    );
    await db.query(
      `INSERT INTO shift_templates (id, name, is_cross_day, start_time_h, start_time_m, end_time_h, end_time_m, is_active)
       VALUES ($1, $2, false, 9, 0, 18, 0, true)`,
      [SEED.template.id, SEED.template.name],
    );
    await db.query(
      `INSERT INTO punch_points (id, name, latitude, longitude, radius_meters, is_active, verify_type)
       VALUES ($1, $2, 25.033964, 121.564468, 100, true, 'GPS')`,
      [SEED.punchPoint.id, SEED.punchPoint.name],
    );
  });
}

/**
 * 計算測試員工在指定期間的排班筆數
 */
export async function countSchedules(startDate: string, endDate: string): Promise<number> {
  return withDb(async (db) => {
    const res = await db.query(
      'SELECT count(*)::int AS n FROM employee_schedule WHERE employee_id LIKE $1 AND schedule_date BETWEEN $2 AND $3',
      [`${PREFIX}%`, startDate, endDate],
    );
    return res.rows[0].n;
  });
}
