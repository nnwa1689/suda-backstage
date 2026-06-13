import api from './client';
import type { ApiResponse } from './client';

export interface SystemTimeResponse {
  statusCode: number;
  success: boolean;
  message: string;
  data: {
    server_time: string; // "2026-01-25 00:08:36"
    time_zone: string;
  };
}

export const getSystemTimeApi = () => {
  return api.get<any, SystemTimeResponse>('/api/v1/common/time');
};

export interface BaseSetting {
  base_id: string;
  base_value: string;
}

/**
 * 取得指定 ID 的系統設定
 * @param baseId 例如 'company_name'
 */
export const getBaseSettingApi = (baseId: string) => {
  return api.get<any, ApiResponse<BaseSetting>>(`/api/v1/common/base/${baseId}`);
};

/**
 * 更新指定 ID 的系統設定
 * @param baseId 例如 'company_name'
 * @param value 新的數值
 */
export const updateBaseSettingApi = (baseId: string, value: string) => {
  return api.post<any, ApiResponse<BaseSetting>>(`/api/v1/common/base/${baseId}`, {
    base_value: value
  });
};