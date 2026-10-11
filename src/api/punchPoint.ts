import api from './client';
import type { ApiResponse } from './client';

export type PunchVerifyType = 'GPS' | 'WIFI' | 'WFH';

// 打卡點 (對應 punch_points)，numeric 欄位由後端以字串回傳
export interface PunchPoint {
  id: string;
  name: string;
  latitude: number | string;
  longitude: number | string;
  radius_meters: number | string;
  is_active: boolean;
  verify_type: PunchVerifyType;
  wifi_ssid: string | null;
  wifi_bssid_list: string[] | null;
  bluetooth_service_uuid: string | null;
  created_at: string;
}

export interface CreatePunchPointPayload {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters?: number;
  isActive?: boolean;
  verifyType: PunchVerifyType;
  wifiSsid?: string;
  wifiBssidList?: string[];
}

export type UpdatePunchPointPayload = Partial<Omit<CreatePunchPointPayload, 'id'>>;

/**
 * 取得打卡點列表
 * @param q 關鍵字 (ID 或名稱)
 */
export const getPunchPointsApi = (q?: string) => {
  return api.get<any, ApiResponse<PunchPoint[]>>('/api/v1/punch-point', { params: q ? { q } : undefined });
};

export const createPunchPointApi = (payload: CreatePunchPointPayload) => {
  return api.post<any, ApiResponse<PunchPoint>>('/api/v1/punch-point', payload);
};

export const updatePunchPointApi = (id: string, payload: UpdatePunchPointPayload) => {
  return api.patch<any, ApiResponse<PunchPoint>>(`/api/v1/punch-point/${id}`, payload);
};

/**
 * 刪除打卡點：後端為軟刪除，會切換啟用/停用狀態
 */
export const togglePunchPointApi = (id: string) => {
  return api.delete<any, ApiResponse<PunchPoint>>(`/api/v1/punch-point/${id}`);
};
