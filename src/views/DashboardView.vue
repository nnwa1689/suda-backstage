<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { getEmployeesApi, type Employee } from '../api/employee';
import { getPunchRecordsApi, type PunchRecord } from '../api/punch';
import UserAvatar from '../components/UserAvatar.vue';

const employees = ref<Employee[]>([]);
const punchRecords = ref<PunchRecord[]>([]);

const isLoading = ref(true);

// 1. 取得今日日期字串 (YYYY-MM-DD)
const getTodayStr = () => {
  // 使用本地時區格式化日期
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date()); 
};

// 2. 計算今日打卡人數 (去重後的員工數)
const todayPunchedCount = computed(() => {
  const uniqueEmployees = new Set(punchRecords.value.map(r => r.employee_id));
  return uniqueEmployees.size;
});

// 3. 取得即時動態
const latestActivities = computed(() => {
  return [...punchRecords.value]
    .sort((a, b) => new Date(b.punch_time).getTime() - new Date(a.punch_time).getTime())
    .slice(0, 10);
});

// 使用 computed 計算在職人數 (is_active = true)
const activeEmployeeCount = computed(() => {
  return employees.value.filter(emp => emp.is_active === true).length;
});

const fetchEmployeeData = async () => {
  isLoading.value = true;
  try {
    const response = await getEmployeesApi(1, 99999);
    // 根據你的結構，資料在 response.data.data
    if (response.success && response.data) {
      employees.value = response.data.data;
    }
  } catch (error) {
    console.error('取得員工清單失敗:', error);
  } finally {
    isLoading.value = false;
  }
};

const fetchTodayPunches = async () => {
  isLoading.value = true;
  const today = getTodayStr();
  
  try {
    const res = await getPunchRecordsApi({
      startDate: today,
      endDate: today,
      page: "1",
      limit: "99999"
    });
    
    if (res.success) {
      punchRecords.value = res.data;
      console.log('今日打卡紀錄:', punchRecords.value);
    }
  } catch (error) {
    console.error('取得打卡紀錄失敗:', error);
  } finally {
    isLoading.value = false;
  }
};

// 格式化時間工具
const formatTime = (isoString: string) => {
  return new Date(isoString).toLocaleTimeString('zh-TW', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

// 根據後端欄位決定狀態顯示
const getRecordStatus = (record: PunchRecord) => {
  if (record.punch_type === 'CHECK_IN') {
    if (record.is_late) return { label: '遲到', class: 'text-orange-600', dot: 'bg-orange-500' };
    return { label: '準時', class: 'text-green-600', dot: 'bg-green-500' };
  } else {
    if (record.is_early) return { label: '早退', class: 'text-red-600', dot: 'bg-red-500' };
    return { label: '正常', class: 'text-green-600', dot: 'bg-green-500' };
  }
};

onMounted(() => {
  fetchEmployeeData();
  fetchTodayPunches();
});
</script>

<template>
  <div class="max-w-7xl mx-auto">
    <div class="relative overflow-hidden rounded-2xl bg-white shadow-sm border border-gray-100 mb-8">
      <div class="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-gradient-to-br from-teal-400/20 to-blue-500/20 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
      <div class="relative z-10 px-6 py-8 sm:px-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 mb-2">你好，管理員！👋</h1>
          <p class="text-gray-500 max-w-xl">
            這裡是 suda 速打考勤系統。
          </p>
        </div>
        <button class="bg-gradient-to-r from-secondary to-primary hover:opacity-90 text-white font-medium py-2.5 px-6 rounded-lg shadow-lg shadow-blue-500/30 transition-all flex items-center gap-2">
          <span class="material-icons-round text-sm">add</span>
          快速排班
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
      <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div class="flex justify-between items-start mb-4">
          <div>
              <p class="text-sm font-medium text-gray-500 dark:text-gray-400">在職人數</p>
              <h3 class="text-3xl font-bold text-gray-900 dark:text-white mt-1">{{ activeEmployeeCount }}</h3>
          </div>
          <div class="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
              <span class="material-icons-round">groups</span>
          </div>
        </div>
      </div>
      <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div class="flex justify-between items-start mb-4">
            <div>
                <p class="text-sm font-medium text-gray-500 dark:text-gray-400">今日實到人數</p>
                <h3 class="text-3xl font-bold text-gray-900 dark:text-white mt-1">{{ todayPunchedCount }}</h3>
            </div>
            <div class="p-2 bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-lg">
                <span class="material-icons-round">fact_check</span>
            </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div class="lg:col-span-2 space-y-6">
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
            <h3 class="font-bold text-gray-900 dark:text-white">即時打卡動態</h3>
            <router-link to="/punchs" class="text-sm text-blue-600 hover:underline">查看全部</router-link>
          </div>
          
          <div class="overflow-x-auto">
            <table class="w-full text-sm text-left">
              <thead class="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th class="px-6 py-3 font-medium">員工姓名</th>
                  <th class="px-6 py-3 font-medium">部門</th>
                  <th class="px-6 py-3 font-medium">時間</th>
                  <th class="px-6 py-3 font-medium">類型</th>
                  <th class="px-6 py-3 font-medium">狀態</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
                <tr v-for="record in latestActivities" :key="record.id" class="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                  <td class="px-6 py-4 font-medium text-gray-900 dark:text-white flex items-center gap-3">
                    <UserAvatar :name="record.employee.name" size="md" />
                    {{ record.employee.name }}
                  </td>
                  <td class="px-6 py-4 text-gray-500 dark:text-gray-400">{{ record.employee.department.name }}</td>
                  <td class="px-6 py-4 text-gray-500 dark:text-gray-400">{{ formatTime(record.punch_time) }}</td>
                  <td class="px-6 py-4">
                    <span :class="record.punch_type === 'CHECK_IN' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'" 
                          class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium">
                      {{ record.punch_type === 'CHECK_IN' ? '上班打卡' : '下班打卡' }}
                    </span>
                  </td>
                  <td class="px-6 py-4">
                    <span :class="getRecordStatus(record).class" class="inline-flex items-center gap-1.5 text-xs font-medium">
                      <span :class="getRecordStatus(record).dot" class="h-1.5 w-1.5 rounded-full"></span>
                      {{ getRecordStatus(record).label }}
                    </span>
                  </td>
                </tr>
                <tr v-if="!isLoading && punchRecords.length === 0">
                  <td colspan="5" class="px-6 py-10 text-center text-gray-400 italic">今日尚無打卡數據</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="space-y-6">
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h3 class="font-bold text-gray-900 dark:text-white mb-4">常用功能</h3>
          <div class="grid grid-cols-2 gap-4">
            <button class="flex flex-col items-center justify-center p-4 rounded-xl bg-gray-50 dark:bg-gray-700 hover:bg-blue-50 transition-all group">
              <span class="material-icons-round text-3xl mb-2 text-gray-400 group-hover:text-blue-500">person_add</span>
              <span class="text-xs font-medium text-gray-600 dark:text-gray-300 group-hover:text-blue-600">新增員工</span>
            </button>
            </div>
        </div>
      </div>
    </div>
  </div>
</template>