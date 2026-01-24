<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { loginApi } from '../api/auth';
import { jwtDecode } from 'jwt-decode';

// 定義 JWT Payload 的結構
interface JwtPayload {
  username: string;
  employeeId: string;
  isAdmin: boolean | string;
  sub: string;
  name: string;
}

const router = useRouter();
const username = ref('');
const password = ref('');
const errorMessage = ref('');
const isLoading = ref(false);

const handleLogin = async () => {
  errorMessage.value = '';
  isLoading.value = true;
  
  try {
    const res = await loginApi(username.value, password.value);
    
    if (res.success && res.data.access_token) {
      const token = res.data.access_token;
      const decoded = jwtDecode<JwtPayload>(token);
      
      // 驗證是否為 admin
      const isAdmin = decoded.isAdmin === 'true' || decoded.isAdmin === true;

      if (isAdmin) {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify({
          name: decoded.name,
          id: decoded.employeeId
        }));
        router.push('/');
      } else {
        errorMessage.value = '存取被拒：您非系統管理員';
      }
    }
  } catch (err: any) {
    // 顯示後端傳回的 message
    errorMessage.value = err.message || '登入失敗';
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="bg-background-light dark:bg-background-dark text-gray-800 dark:text-gray-200 min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
    
    <div class="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
      <div class="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-[#2dd4bf]/20 blur-[100px]"></div>
      <div class="absolute top-[20%] right-[10%] w-[30%] h-[30%] rounded-full bg-[#3b82f6]/20 blur-[80px]"></div>
      <div class="absolute -bottom-[10%] left-[20%] w-[35%] h-[35%] rounded-full bg-purple-400/20 blur-[90px]"></div>
    </div>

    <div class="w-full max-w-5xl flex flex-col md:flex-row bg-white dark:bg-surface-dark rounded-2xl shadow-2xl overflow-hidden min-h-[600px]">
      
      <div class="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center items-center relative bg-gradient-to-br from-blue-50 to-teal-50 dark:from-gray-800 dark:to-gray-900 border-b md:border-b-0 md:border-r border-gray-100 dark:border-gray-700">
        <div class="mb-8 transform hover:scale-105 transition-transform duration-500">
          <div class="w-32 h-32 md:w-40 md:h-40 bg-white dark:bg-gray-800 rounded-3xl shadow-xl flex items-center justify-center mx-auto">
             <img src="@/assets/SudaIcon.png" alt="Suda Logo" class="w-20 h-20 md:w-24 md:h-24" />
          </div>
        </div>
        <h1 class="text-3xl md:text-4xl font-bold mb-2 tracking-tight">
          <span class="bg-clip-text text-transparent bg-gradient-to-r from-[#3b82f6] to-[#2dd4bf]">Suda</span> 速打
        </h1>
        <p class="text-gray-500 dark:text-gray-400 text-lg font-medium mb-8">智慧排班 · 秒速打卡 · 輕鬆管理</p>
      </div>

      <div class="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-white dark:bg-surface-dark relative">
        <div class="max-w-md w-full mx-auto">
          <h2 class="text-2xl font-bold text-gray-800 dark:text-white mb-2">歡迎回來</h2>
          <p class="text-gray-500 dark:text-gray-400 mb-8 text-sm">請輸入您的帳號密碼以登入後台系統</p>
          
          <form @submit.prevent="handleLogin" class="space-y-6">
            <div v-if="errorMessage" class="p-3 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-500 border border-red-100 dark:border-red-800 text-sm flex items-center gap-2">
              <span class="material-icons-outlined text-base">error_outline</span>
              {{ errorMessage }}
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">員工編號</label>
              <div class="relative">
                <span class="material-icons-outlined absolute left-3 top-3.5 text-gray-400 text-xl pointer-events-none">person_outline</span>
                <input v-model="username" type="text" 
                       class="block w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 py-3 px-4 pl-10 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" 
                       placeholder="ID" required />
              </div>
            </div>

            <div>
              <div class="flex items-center justify-between mb-2">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">密碼</label>
              </div>
              <div class="relative">
                <span class="material-icons-outlined absolute left-3 top-3.5 text-gray-400 text-xl pointer-events-none">lock_open</span>
                <input v-model="password" type="password" 
                       class="block w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 py-3 px-4 pl-10 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" 
                       placeholder="••••••••" required />
              </div>
            </div>

            <button type="submit" 
                    :disabled="isLoading"
                    class="w-full py-3 px-4 rounded-xl shadow-lg text-sm font-medium text-white bg-gradient-to-r from-[#3b82f6] to-[#2dd4bf] hover:opacity-90 transition-all transform hover:-translate-y-0.5 flex justify-center items-center gap-2 disabled:opacity-50 disabled:transform-none">
              <span v-if="isLoading" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              {{ isLoading ? '請稍後...' : '立即登入' }}
            </button>
          </form>

          <div class="mt-8 text-center">
            <p class="text-xs text-gray-400 dark:text-gray-500">© 2024 Suda System. All rights reserved.</p>
            <div class="mt-4 flex justify-center space-x-4 text-gray-400 dark:text-gray-600">
                <a class="hover:text-[#3b82f6] transition-colors text-xs" href="#">隱私權政策</a>
                <span class="text-xs">•</span>
                <a class="hover:text-[#3b82f6] transition-colors text-xs" href="#">使用條款</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 移除所有 @apply 以避免 Tailwind v4 編譯錯誤 */
.animate-spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>