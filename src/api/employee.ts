import api from './client';
import type { ApiResponse } from './client';

// 假設的部門介面
export interface Department {
  id: string;
  name: string;
}

// 員工介面
export interface Employee {
  id: string;
  name: string;
  department_id: string;
  department?: Department; // 可以包含部門物件
  is_active: boolean; // 是否在職
  arrival: string; // 到職日
  active_device?: { // 活躍的裝置綁定資訊
    id: string;
    employee_id: string;
    device_uuid: string; // 裝置唯一識別碼
    device_type: string; // 裝置類型 (iOS/Android)
    is_active: boolean;
    created_at: string;
  };
  // activeDeviceUuid?: string; // 裝置唯一識別碼
  // device_type?: string; // 裝置類型 (iOS/Android)
  // ... 其他員工屬性
}

// 分頁元數據介面
export interface PaginationMeta {
  total: number;
  perPage: number;
  page: number;
  totalPages: number;
}

// 取得員工列表的響應介面
export interface GetEmployeesResponse {
  data: Employee[];
  meta: PaginationMeta;
}

/**
 * 取得員工列表
 * @param page 頁碼
 * @param limit 每頁數量
 */
export const getEmployeesApi = (page: number = 1, limit: number = 10) => {
  // 列表通常使用複數路徑 /api/v1/employees
  return api.get<any, ApiResponse<GetEmployeesResponse>>(`/api/v1/employees?page=${page}&limit=${limit}`);
};

/**
 * 取得所有啟用中的員工 (用於下拉選單)
 */
export const getActiveEmployeesApi = () => {
  return api.get<any, ApiResponse<Employee[]>>('/api/v1/employees?isActive=true&limit=1000');
};

/**
 * 建立員工的請求介面
 */
export interface CreateEmployeePayload {
  id: string;
  name: string;
  departmentId: string;
  isActive: boolean;
  arrival: string;
}

/**
 * 建立新員工
 */
export const createEmployeeApi = (payload: CreateEmployeePayload) => {
  return api.post<any, ApiResponse<Employee>>('/api/v1/employee', payload);
};

/**
 * 取得單一員工資料
 * @param employeeId 員工 ID
 */
export const getEmployeeByIdApi = (employeeId: string) => {
  // 模擬 API 呼叫
  return api.get<any, ApiResponse<Employee>>(`/api/v1/employee/${employeeId}`);
};

/**
 * 更新員工資料的請求介面
 */
export interface UpdateEmployeePayload {
  name?: string;
  departmentId?: string;
  isActive?: boolean;
  arrival?: string;
}

/**
 * 更新員工資料
 * @param employeeId 員工 ID
 * @param payload 更新的資料
 */
export const updateEmployeeApi = (employeeId: string, payload: UpdateEmployeePayload) => {
  return api.post<any, ApiResponse<Employee>>(`/api/v1/employee/${employeeId}`, payload);
};

/**
 * 解除裝置綁定 (Unbind Device)
 */
export interface UnbindDevicePayload {
  employeeId: string;
  deviceUuid: string;
  deviceType: string;
}

export const unbindDeviceApi = (payload: UnbindDevicePayload) => {
  /**
   * 注意：Axios 的 DELETE 方法若要傳送 Body，需放在 config 的 data 屬性中
   */
  return api.delete<any, ApiResponse<{
    employeeId: string;
    deviceUuid: string;
    isActive: boolean;
  }>>('/api/v1/device/unbind', {
    data: payload
  });
};