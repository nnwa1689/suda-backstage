<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { getSystemTimeApi } from '../api/common';
import UserAvatar from '../components/UserAvatar.vue';

const router = useRouter()
const route = useRoute()

// 控制行動版側邊欄
const isMobileMenuOpen = ref(false)

const currentUser = ref({
  name: '讀取中...',
  id: ''
});

const displayDate = ref('');
const displayTime = ref('');
const displayDay = ref('');
let timer: number | null = null;

const updateTime = (serverDate: Date) => {
  const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  
  displayDate.value = `${serverDate.getFullYear()}年 ${serverDate.getMonth() + 1}月 ${serverDate.getDate()}日`;
  displayDay.value = days[serverDate.getDay()];
  displayTime.value = serverDate.toLocaleTimeString('zh-TW', { 
    hour12: true, 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit' // 如果不需要秒，可以移除
  });
};

const syncSystemTime = async () => {
  try {
    const res = await getSystemTimeApi();
    if (res.success) {
      // 解析伺服器回傳的時間字串 (處理空格改為 T 讓 Date 解析更穩定)
      const serverTimeStr = res.data.server_time.replace(' ', 'T');
      let currentTime = new Date(serverTimeStr);

      // 啟動每秒更新
      timer = window.setInterval(() => {
        currentTime.setSeconds(currentTime.getSeconds() + 1);
        updateTime(currentTime);
      }, 1000);
      
      updateTime(currentTime); // 立即顯示第一次
    }
  } catch (error) {
    console.error('伺服器時間同步失敗', error);
  }
};

// 選單資料結構
const menuGroups = [
  {
    groupName: '主控台',
    items: [
      { name: '首頁儀表', icon: 'dashboard', path: '/' },
    ]
  },
  {
    groupName: '人員與部門',
    items: [
      { name: '員工管理', icon: 'people', path: '/employees' },
      { name: '部門管理', icon: 'badge', path: '/depts' },
    ]
  },
  {
    groupName: '考勤與排班',
    items: [
      { name: '班別設定', icon: 'label', path: '/templates' },
      { name: '個別排班', icon: 'schedule', path: '/schedules' },
      { name: '批次排班', icon: 'schedule', path: '/batchschedules' },
      { name: '打卡紀錄調整', icon: 'history', path: '/punchs' }
    ]
  },
  {
    groupName: '系統設定',
    items: [
      { name: '基本資料設定', icon: 'settings', path: '/settings' },
      { name: '打卡點設定', icon: 'place', path: '/locations' }
    ]
  }
]

onMounted(() => {
  syncSystemTime();
  const userData = localStorage.getItem('user');
  if (userData) {
    try {
      currentUser.value = JSON.parse(userData);
    } catch (e) {
      console.error('解析使用者資訊失敗', e);
    }
  }
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});

const handleLogout = () => {
  // 清除 Token 邏輯
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  router.replace('/login');
}
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-background-light text-gray-800">
    
    <aside class="w-64 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col hidden md:flex">
      <div class="h-16 flex items-center px-6 border-b border-gray-100">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full flex items-center justify-center text-white shadow-lg shadow-teal-500/30">
            <img src="@/assets/SudaIcon.png" alt="Suda Logo" class="w-8 h-8" />
          </div>
          <span class="text-xl font-bold tracking-tight text-gray-900">速打<span class="text-xs font-normal text-gray-500">，打卡好輕鬆</span></span>
        </div>
      </div>

      <nav class="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        <template v-for="group in menuGroups" :key="group.groupName">
          <p class="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-6">{{ group.groupName }}</p>
          <router-link 
            v-for="item in group.items" 
            :key="item.path"
            :to="item.path"
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all"
            :class="[
              route.path === item.path 
                ? 'bg-blue-50 text-primary font-medium' 
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            ]"
          >
            <span class="material-icons-round">{{ item.icon }}</span>
            {{ item.name }}
          </router-link>
        </template>
      </nav>

      <div class="p-4 border-t border-gray-200">
        <div class="flex items-center gap-3">
          <UserAvatar :name="currentUser.name" size="md" />
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-900 truncate">{{ currentUser.name }}</p>
            <p class="text-xs text-gray-500 truncate">{{ currentUser.id}}</p>
          </div>
          <button @click="handleLogout" class="text-gray-400 hover:text-red-500 transition-colors">
            <span class="material-icons-round">logout</span>
          </button>
        </div>
      </div>
    </aside>

    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
      
      <header class="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 z-10">
        <button @click="isMobileMenuOpen = true" class="md:hidden p-2 rounded-md text-gray-400 hover:bg-gray-100">
          <span class="material-icons-round">menu</span>
        </button>

        <div class="hidden md:flex items-center gap-4">
          <h2 class="text-lg font-semibold text-gray-800">BackStage｜管理平台</h2>
        </div>

        <div class="hidden sm:block text-right mr-4 border-r border-gray-100 pr-4">
          <div class="text-sm font-semibold text-gray-900">{{ displayDate }}</div>
          <div class="text-xs text-gray-500 flex items-center justify-end gap-2">
            <span class="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
            {{ displayDay }} {{ displayTime }}
          </div>
        </div>
      </header>

      <main class="flex-1 overflow-y-auto bg-background-light p-4 sm:p-6 lg:p-8">
        <router-view />
      </main>
    </div>
  </div>
</template>

<style scoped>
.gradient-bg {
  background: linear-gradient(135deg, #2dd4bf 0%, #3b82f6 100%);
}
</style>