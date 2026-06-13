import api from './client';
import type { ApiResponse } from './client';

// 部門介面
export interface Department {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  parent_department_id?: string; // 修正為與後端 DTO 一致的欄位名稱
  manager_id?: string; // 部門管理者 ID
}

// 分頁元數據介面
export interface PaginationMeta {
  total: number;
  perPage: number;
  page: number;
  totalPages: number;
}

// 取得部門列表的響應介面 (用於分頁)
export interface GetDepartmentsPaginatedResponse {
  data: Department[];
  meta: PaginationMeta;
}

/**
 * 建立部門的請求介面
 */
export interface CreateDepartmentPayload {
  id: string; // 後端要求 id 不能為空
  name: string;
  parent_department_id: string; // 後端要求 parentId 不得存在，改用此欄位且不能為空
  manager_id?: string;
}

/**
 * 更新部門的請求介面
 */
export interface UpdateDepartmentPayload {
  name?: string;
  is_active?: boolean;
  parent_department_id?: string; // 修正為蛇形命名以符合後端要求
  manager_id?: string;
}

/**
 * 建立新部門
 * @param payload 部門資料
 */
export const createDepartmentApi = (payload: CreateDepartmentPayload) => {
  return api.post<any, ApiResponse<Department>>('/api/v1/departments', payload);
};

/**
 * 取得單一部門資料
 * @param departmentId 部門 ID
 */
export const getDepartmentByIdApi = (departmentId: string) => {
  // 根據部門 API 規格，單一取得與更新應使用複數路徑 /api/v1/departments/:id
  return api.get<any, ApiResponse<Department>>(`/api/v1/departments/${departmentId}`);
};

/**
 * 獲取所有部門列表 (包含已停用，無分頁)
 */
export const getAllDepartmentsApi = () => {
  return api.get<any, ApiResponse<Department[]>>('/api/v1/departments');
};

/**
 * 獲取啟用中的部門選單 (僅 id 和 name)
 */
export const getActiveDepartmentsApi = () => {
  return api.get<any, ApiResponse<{ id: string; name: string }[]>>('/api/v1/departments/active');
};

/**
 * 獲取部門列表 (分頁)
 * @param page 頁碼
 * @param limit 每頁數量
 */
export const getDepartmentsPaginatedApi = (page: number = 1, limit: number = 10) => {
  return api.get<any, ApiResponse<GetDepartmentsPaginatedResponse>>(`/api/v1/departments?page=${page}&limit=${limit}`);
};

/**
 * 更新部門資料
 * @param departmentId 部門 ID
 * @param payload 更新的資料
 */
export const updateDepartmentApi = (departmentId: string, payload: UpdateDepartmentPayload) => {
  // 根據部門 API 規格，單一取得與更新應使用複數路徑 /api/v1/departments/:id
  return api.patch<any, ApiResponse<Department>>(`/api/v1/departments/${departmentId}`, payload);
};