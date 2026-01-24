import api from './client';

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