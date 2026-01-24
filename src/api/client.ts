// src/api/client.ts
import axios, { type InternalAxiosRequestConfig } from 'axios';

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
  (response) => response.data,
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

export default api;