// src/api/punch.ts
import api from './client';
import type { Employee, PaginationMeta } from './employee';
import type { ApiResponse } from './client';

export interface PunchRecord {
  id: string;
  employee_id: string;
  employee_name: string; // 假設後端有扁平化處理姓名
  employee: Employee
  punch_time: string;
  punch_type: 'CHECK_IN' | 'CHECK_OUT'; // 上班或下班
  is_late: boolean;   // 遲到
  is_early: boolean;  // 早退
}

export interface PunchListData {
  data: PunchRecord[];
  meta: PaginationMeta;
}

export const getPunchRecordsApi = (params: {
  startDate: string;
  endDate: string;
  employeeId?: string;
  departmentId?: string;
  page?: string;
  limit?: string;
}) => {
  return api.post<any, ApiResponse<PunchListData>>('/api/v1/punch/all-records', params);
};