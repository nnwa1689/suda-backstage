import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

// 1. 定義 API 回傳的標準資料結構
interface LoginResponse {
  statusCode: number;
  success: boolean;
  message: string;
  data: {
    access_token: string;
  };
}

// 2. 定義錯誤回覆的結構
interface ApiError {
  message: string;
  error: string;
  statusCode: number;
}

// 3. 建立 Axios 實體
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://your-api-domain.com',
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      // 這裡會自動幫你在 Header 加上 Authorization: Bearer xxxxx.yyyyy.zzzzz
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const originalRequest = error.config;
    // 如果後端回傳 401 Unauthorized，代表 Token 無效或過期
    if (error.response && error.response.status === 401 && !originalRequest.url.includes('/auth/login')) {
      console.warn('Token 已過期或無效，執行自動登出');
      localStorage.removeItem('token');
      window.location.href = '/login'; // 強制跳轉
    }
    return Promise.reject(error);
  }
);

/**
 * 登入 API 函式
 * @param username 帳號 (工號 0000)
 * @param password 密碼 (123456)
 */
export const loginApi = async (username: string, password: string): Promise<LoginResponse> => {
  try {
    const response = await api.post<LoginResponse>('/api/v1/auth/login', {
      username,
      password
    });
    return response.data;
  } catch (error) {
    const err = error as AxiosError<ApiError>;
    
    // 關鍵點：只要後端有回傳 Data (不論是 401, 404, 500)，我們都抓取 message
    if (err.response && err.response.data) {
      // 這裡會抓到 {"message":"使用者不存在或未啟用", ...}
      throw err.response.data; 
    }
    
    // 處理連線失敗（例如後端掛掉，沒有 response）
    throw { message: '連線伺服器失敗，請檢查網路' };
  }
};