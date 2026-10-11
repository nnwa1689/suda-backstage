import api from './client';
import type { ApiResponse } from './client';
import type { Employee } from './employee';
import type { ShiftTemplate } from './shiftTemplate';

export type ScheduleType = 'fixed' | 'daily';

// 排班 (對應 employee_schedule)
export interface EmployeeSchedule {
  id: string;
  employee_id: string;
  schedule_date: string; // YYYY-MM-DD
  shift_template_id: string;
  schedule_type: ScheduleType;
  created_at: string;
  updated_at: string;
  employee?: Employee;
  template?: ShiftTemplate;
}

export interface SchedulePayload {
  employeeId: string;
  scheduleDate: string; // YYYY-MM-DD
  shiftTemplateId: string;
  scheduleType: ScheduleType;
}

/**
 * 查詢排班
 */
export const getSchedulesApi = (params: {
  employeeId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}) => {
  return api.get<any, ApiResponse<EmployeeSchedule[]>>('/api/v1/schedule', { params });
};

/**
 * 新增單筆排班
 */
export const createScheduleApi = (payload: SchedulePayload) => {
  return api.post<any, ApiResponse<EmployeeSchedule>>('/api/v1/schedule', payload);
};

/**
 * 更新單筆排班
 */
export const updateScheduleApi = (id: string, payload: SchedulePayload) => {
  return api.patch<any, ApiResponse<EmployeeSchedule>>(`/api/v1/schedule/${id}`, payload);
};

/**
 * 刪除單筆排班
 */
export const deleteScheduleApi = (id: string) => {
  return api.delete(`/api/v1/schedule/${id}`);
};

export interface BatchScheduleRow {
  departmentId: string;
  employeeId: string;
  shiftTemplateId: string;
  isCyclic: string; // 是否循環班別：Y/N (後端驗證)
}

export interface BatchSchedulePayload {
  month: string; // YYYY-MM
  rows: BatchScheduleRow[];
}

/**
 * 批次匯入一個月的排班，任一筆驗證失敗則整批不匯入 (錯誤明細於 response.data.errors)
 * 循環班別寫入該月 1 號一筆 (fixed)；非循環班別該月每天各一筆 (daily)
 */
export const batchImportSchedulesApi = (payload: BatchSchedulePayload) => {
  return api.post<any, ApiResponse<{ rowCount: number; scheduleCount: number }>>('/api/v1/schedule/batch', payload);
};
