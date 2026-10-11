// src/api/punch.ts
import api from './client';
import type { Employee } from './employee';
import type { ApiResponse } from './client';
import type { PunchPoint } from './punchPoint';

export interface PunchRecord {
  id: string;
  employee_id: string;
  employee: Employee
  punch_time: string;
  punch_type: 'CHECK_IN' | 'CHECK_OUT'; // 上班或下班
  is_late: boolean;   // 遲到
  is_early: boolean;  // 早退
  punch_points_id: string;
  punchPoint?: PunchPoint;
  recorded_lat: number | string;
  recorded_lng: number | string;
  remark: string | null;
}

export const getPunchRecordsApi = (params: {
  startDate: string;
  endDate: string;
  employeeId?: string;
  departmentId?: string;
  page?: string;
  limit?: string;
}) => {
  // 回傳的 data 為紀錄陣列，未提供總筆數
  return api.post<any, ApiResponse<PunchRecord[]>>('/api/v1/punch/all-records', params);
};

/**
 * 打卡紀錄調整用 payload (對應 punch_logs)
 */
export interface PunchRecordPayload {
  employeeId: string;
  punchTime: string; // ISO 8601
  punchPointsId: string;
  punchType: 'CHECK_IN' | 'CHECK_OUT';
  recordedLat?: number;
  recordedLng?: number;
  isLate?: boolean;   // 未提供時後端依排班自動計算
  isEarly?: boolean;
  remark?: string;
}

/**
 * 新增打卡紀錄 (補登)
 */
export const createPunchRecordApi = (payload: PunchRecordPayload) => {
  return api.post<any, ApiResponse<PunchRecord>>('/api/v1/punch/records', payload);
};

/**
 * 更新打卡紀錄
 */
export const updatePunchRecordApi = (id: string, payload: Partial<PunchRecordPayload>) => {
  return api.patch<any, ApiResponse<PunchRecord>>(`/api/v1/punch/records/${id}`, payload);
};

/**
 * 刪除打卡紀錄
 */
export const deletePunchRecordApi = (id: string) => {
  return api.delete<any, ApiResponse<{ id: string }>>(`/api/v1/punch/records/${id}`);
};
