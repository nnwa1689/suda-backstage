<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { getEmployeesApi, type Employee, type PaginationMeta } from '../api/employee';
import { useRouter } from 'vue-router';

const router = useRouter();

const employees = ref<Employee[]>([]);
const currentPage = ref(1);
const limit = ref(10); // 每頁顯示的員工數量
const totalPages = ref(1);
const isLoading = ref(false);
const hasError = ref(false); // 新增錯誤狀態

// 取得員工列表
const fetchEmployees = async () => {
  isLoading.value = true;
  hasError.value = false;
  try {
    const res = await getEmployeesApi(currentPage.value, limit.value);
    if (res.success) {
      // 如果後端回傳的是分頁結構 { data: [], meta: {} }
      if (res.data && 'data' in res.data && 'meta' in res.data) {
        employees.value = res.data.data;
        totalPages.value = res.data.meta.totalPages || 1;
        currentPage.value = res.data.meta.page || 1;
      } else if (Array.isArray(res.data)) {
        // 如果後端回傳的是扁平陣列 [ ... ]
        employees.value = res.data;
        totalPages.value = 1;
      }
    }
  } catch (error) {
    console.error('取得員工列表失敗:', error);
    hasError.value = true;
  } finally {
    isLoading.value = false;
  }
};

// 導航到指定頁碼
const goToPage = (page: number) => {
  if (page > 0 && page <= totalPages.value && page !== currentPage.value) {
    currentPage.value = page;
    fetchEmployees();
  }
};

// 處理編輯按鈕點擊事件
const handleEdit = (employeeId: string) => {
  console.log('編輯員工 ID:', employeeId);
  router.push({ name: 'EmployeeEdit', params: { id: employeeId } });
};

onMounted(() => {
  fetchEmployees();
});

// 計算分頁按鈕的顯示範圍
const paginationRange = computed(() => {
  const range = [];
  const start = Math.max(1, currentPage.value - 2);
  const end = Math.min(totalPages.value, currentPage.value + 2);

  for (let i = start; i <= end; i++) {
    range.push(i);
  }
  return range;
});
</script>

<template>
  <div class="max-w-6xl mx-auto p-6">
    <div class="mb-8 flex justify-between items-end">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">員工管理</h1>
        <p class="text-gray-500 mt-1">管理公司的員工資訊。</p>
      </div>
      <button 
        @click="router.push({ name: 'EmployeeCreate' })"
        class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
      >
        <span>+ 新增員工</span>
      </button>
    </div>

    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div class="p-6 sm:p-8 space-y-6">
        <!-- 員工列表 -->
        <div v-if="isLoading" class="flex justify-center items-center py-10">
          <span class="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></span>
          <p class="ml-3 text-gray-600">載入中...</p>
        </div>
        <div v-else-if="hasError" class="text-center py-10">
          <p class="text-red-500 mb-4 font-medium">資料讀取失敗，請確認 API 路徑是否正確。</p>
          <button 
            @click="fetchEmployees"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            重新嘗試
          </button>
        </div>
        <div v-else-if="employees.length === 0" class="text-center py-10 text-gray-500">
          目前沒有員工資料。
        </div>
        <div v-else class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  姓名
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  部門
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  狀態
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  到職日
                </th>
                <th scope="col" class="relative px-6 py-3">
                  <span class="sr-only">編輯</span>
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="employee in employees" :key="employee.id">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {{ employee.name }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {{ employee.department?.name || 'N/A' }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                  <span :class="[
                    'px-2 inline-flex text-xs leading-5 font-semibold rounded-full',
                    employee.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  ]">
                    {{ employee.is_active ? '在職' : '離職' }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {{ employee.arrival }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button 
                    @click="handleEdit(employee.id)" 
                    class="text-blue-600 hover:text-blue-900"
                  >
                    編輯
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 分頁控制項 -->
        <nav v-if="totalPages > 1 && !isLoading" class="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6" aria-label="Pagination">
          <div class="flex-1 flex justify-between sm:justify-end">
            <button 
              @click="goToPage(currentPage - 1)" 
              :disabled="currentPage === 1"
              class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              上一頁
            </button>
            <div class="hidden sm:flex sm:items-center sm:space-x-1 ml-4">
              <button
                v-for="page in paginationRange"
                :key="page"
                @click="goToPage(page)"
                :class="[
                  'relative inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md',
                  page === currentPage ? 'z-10 bg-blue-50 border-blue-500 text-blue-600' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                ]"
              >
                {{ page }}
              </button>
            </div>
            <button 
              @click="goToPage(currentPage + 1)" 
              :disabled="currentPage === totalPages"
              class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              下一頁
            </button>
          </div>
        </nav>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 如果有需要，可以在這裡添加組件特有的樣式 */
</style>