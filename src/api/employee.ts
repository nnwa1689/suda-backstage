// src/api/employee.ts
import api from './client';

export interface Department {
  name: string;
}

export interface Employee {
  id: string;
  name: string;
  department_id: string;
  department: Department;
  is_active: boolean;
  created_at: string;
  arrival: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// 對應你提供的 API 回覆結構
export interface ApiResponse<T> {
  statusCode: number;
  success: boolean;
  message: string;
  data: T;
}

export interface EmployeeListData {
  data: Employee[];
  meta: PaginationMeta;
}

export const getEmployeesApi = (page = 1, limit = 9999) => {
  return api.get<any, ApiResponse<EmployeeListData>>(`/api/v1/employees`, {
    params: { page, limit }
  });
};