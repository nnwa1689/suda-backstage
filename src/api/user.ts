import api from './client';
import type { ApiResponse } from './client';

/**
 * 建立新使用者帳號的請求介面
 */
export interface RegisterUserPayload {
  username: string;
  password: string;
  employeeId: string;
}

/**
 * 建立新使用者帳號的回傳格式
 */
export interface RegisterUserResponse {
  message: string;
  userId: string;
  username: string;
}

/**
 * 建立新使用者帳號 (Register User Account)
 * @param payload 帳號資料
 */
export const registerUserAccountApi = (payload: RegisterUserPayload) => {
  return api.post<any, ApiResponse<RegisterUserResponse>>('/api/v1/users/register', payload);
};