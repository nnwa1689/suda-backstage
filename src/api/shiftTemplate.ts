import api from './client';
import type { ApiResponse } from './client';

// 班別模板 (對應 shift_templates)
export interface ShiftTemplate {
  id: string;
  name: string;
  is_cross_day: boolean;
  start_time_h: number;
  start_time_m: number;
  end_time_h: number;
  end_time_m: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateShiftTemplatePayload {
  id: string;
  name: string;
  isCrossDay: boolean;
  startTimeH: number;
  startTimeM: number;
  endTimeH: number;
  endTimeM: number;
  isActive: boolean;
}

export type UpdateShiftTemplatePayload = Partial<Omit<CreateShiftTemplatePayload, 'id'>>;

/**
 * 取得所有班別
 */
export const getShiftTemplatesApi = () => {
  return api.get<any, ApiResponse<ShiftTemplate[]>>('/api/v1/shift/template');
};

/**
 * 新增班別
 */
export const createShiftTemplateApi = (payload: CreateShiftTemplatePayload) => {
  return api.post<any, ApiResponse<ShiftTemplate>>('/api/v1/shift/template', payload);
};

/**
 * 更新班別
 */
export const updateShiftTemplateApi = (id: string, payload: UpdateShiftTemplatePayload) => {
  return api.patch<any, ApiResponse<ShiftTemplate>>(`/api/v1/shift/template/${id}`, payload);
};

/**
 * 格式化班別時間，例如 09:00 - 18:00 (跨日)
 */
export const formatShiftTime = (t: ShiftTemplate) => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(t.start_time_h)}:${pad(t.start_time_m)} - ${t.is_cross_day ? '隔日 ' : ''}${pad(t.end_time_h)}:${pad(t.end_time_m)}`;
};
