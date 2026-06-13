<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getEmployeeByIdApi, updateEmployeeApi, unbindDeviceApi, type Employee } from '../api/employee';
import { getActiveDepartmentsApi, type Department } from '../api/department'; // Import from department.ts

const route = useRoute();
const router = useRouter();

const employeeId = ref<string | string[]>(route.params.id);
const employee = ref<Employee | null>(null);
const originalEmployee = ref<Employee | null>(null); // 用於取消時還原
const departments = ref<Department[]>([]);

const isLoading = ref(false);
const isSaving = ref(false);
const isResettingDevice = ref(false);
const fetchError = ref(false);

// 表單資料
const employeeName = ref('');
const selectedDepartmentId = ref('');
const isActive = ref(true);

// 取得員工資料
const fetchEmployee = async () => {
  isLoading.value = true;
  try {
    const res = await getEmployeeByIdApi(employeeId.value as string);
    if (res.success && res.data) {
      employee.value = res.data;
      originalEmployee.value = { ...res.data }; // 儲存原始資料
      employeeName.value = res.data.name;
      selectedDepartmentId.value = res.data.department_id;
      isActive.value = res.data.is_active;
    } else {
      fetchError.value = true;
    }
  } catch (error) {
    console.error('取得員工資料失敗:', error);
    fetchError.value = true;
  } finally {
    isLoading.value = false;
  }
};

// 取得所有部門資料
const fetchDepartments = async () => {
  try {
    const res = await getActiveDepartmentsApi(); // Use the new API
    if (res.success && res.data) {
      departments.value = res.data;
    }
  } catch (error) {
    console.error('取得部門列表失敗:', error);
    // 可以在這裡顯示錯誤訊息給使用者
  }
};

// 更新員工資料
const handleUpdateEmployee = async () => {
  if (!employee.value) return;

  if (!employeeName.value.trim()) {
    alert('員工姓名不能為空。');
    return;
  }
  if (!selectedDepartmentId.value) {
    alert('請選擇所屬部門。');
    return;
  }

  isSaving.value = true;
  try {
    const payload = {
      name: employeeName.value,
      departmentId: selectedDepartmentId.value,
      isActive: isActive.value,
      arrival: employee.value.arrival
    };

    const res = await updateEmployeeApi(employeeId.value as string, payload);
    if (res.success && res.data) {
      alert('員工資料更新成功！');
      employee.value = res.data;
      originalEmployee.value = { ...res.data }; // 使用後端回傳的完整資料更新原始狀態
    } else {
      alert('更新失敗，請稍後再試。');
    }
  } catch (error) {
    console.error('更新員工資料失敗:', error);
    alert('更新員工資料失敗，請檢查網路或稍後再試。');
  } finally {
    isSaving.value = false;
  }
};

// 重設員工打卡裝置
const handleResetPunchDevice = async () => {
  if (!employee.value) return;
  
  // 檢查是否有裝置資訊
  if (!employee.value.active_device || !employee.value.active_device.device_uuid) {
    alert('此員工目前尚未綁定任何裝置。');
    return;
  }

  if (!confirm('確定要解除此員工的裝置綁定嗎？')) {
    return;
  }

  isResettingDevice.value = true;
  try {
    const payload = {
      employeeId: employee.value.id, // 確保使用 API 要求的 camelCase 欄位
      deviceUuid: employee.value.active_device.device_uuid,
      deviceType: employee.value.active_device.device_type || 'Unknown' // 如果 device_type 不存在，提供預設值
    };

    const res = await unbindDeviceApi(payload);
    if (res.success) {
      alert('裝置已成功解除綁定/禁用。');
      // 更新本地狀態，讓介面反映目前無裝置
      employee.value.active_device = undefined; // 將整個 active_device 物件設為 undefined
    } else {
      alert('重設打卡裝置失敗，請稍後再試。');
    }
  } catch (error) {
    console.error('重設打卡裝置失敗:', error);
    alert('重設打卡裝置失敗，請檢查網路或稍後再試。');
  } finally {
    isResettingDevice.value = false;
  }
};

// 取消編輯，還原資料
const handleCancel = () => {
  if (originalEmployee.value) {
    employeeName.value = originalEmployee.value.name;
    selectedDepartmentId.value = originalEmployee.value.department_id;
    isActive.value = originalEmployee.value.is_active;
  }
};

onMounted(() => {
  fetchEmployee();
  fetchDepartments();
});

// 監聽路由參數變化，如果 ID 改變則重新載入資料 (例如從一個員工編輯頁面跳到另一個)
watch(() => route.params.id, (newId) => {
  if (newId && newId !== employeeId.value) {
    employeeId.value = newId;
    fetchEmployee();
  }
});
</script>

<template>
  <div class="max-w-4xl mx-auto p-6">
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-gray-900">編輯員工資料</h1>
      <p class="text-gray-500 mt-1">管理員工的詳細資訊。</p>
    </div>

    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div class="p-6 sm:p-8 space-y-6">
        <div v-if="isLoading" class="flex justify-center items-center py-10">
          <span class="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></span>
          <p class="ml-3 text-gray-600">載入員工資料中...</p>
        </div>
        <div v-else-if="fetchError || !employee" class="text-center py-10">
          <p class="text-red-500 mb-4 font-medium">取得員工資料失敗，請檢查網路或稍後再試。</p>
          <div class="flex justify-center gap-3">
            <button 
              @click="router.push({ name: 'EmployeeManagement' })"
              class="px-5 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors"
            >
              返回列表
            </button>
            <button 
              @click="fetchEmployee"
              class="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              重新嘗試
            </button>
          </div>
        </div>
        <div v-else class="space-y-6">
          <!-- 員工 ID (唯讀) -->
          <div class="max-w-md">
            <label for="display-employee-id" class="block text-sm font-semibold text-gray-700 mb-2">員工 ID</label>
            <input 
              id="display-employee-id"
              :value="employeeId" 
              type="text" 
              disabled 
              class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-500 cursor-not-allowed"
            />
          </div>

          <!-- 員工姓名 -->
          <div class="max-w-md">
            <label for="employee-name" class="block text-sm font-semibold text-gray-700 mb-2">員工姓名</label>
            <input 
              id="employee-name"
              v-model="employeeName" 
              type="text" 
              placeholder="請輸入員工姓名"
              class="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all disabled:bg-gray-50"
              :disabled="isSaving"
            />
          </div>

          <!-- 所屬部門 -->
          <div class="max-w-md">
            <label for="employee-department" class="block text-sm font-semibold text-gray-700 mb-2">所屬部門</label>
            <select 
              id="employee-department"
              v-model="selectedDepartmentId" 
              class="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all disabled:bg-gray-50"
              :disabled="isSaving"
            >
              <option value="" disabled>請選擇部門</option>
              <option v-for="dept in departments" :key="dept.id" :value="dept.id">
                {{ dept.name }}
              </option>
            </select>
          </div>

          <!-- 停用員工 (離職) -->
          <div class="flex items-center max-w-md">
            <input 
              id="employee-active"
              type="checkbox" 
              v-model="isActive" 
              class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              :disabled="isSaving"
            />
            <label for="employee-active" class="ml-2 block text-sm text-gray-900">
              員工在職中 (取消勾選表示離職)
            </label>
          </div>

          <!-- 重設員工打卡裝置 -->
          <div class="pt-4 border-t border-gray-50">
            <button 
              @click="handleResetPunchDevice"
              :disabled="isResettingDevice || isSaving"
              class="bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white font-medium py-2.5 px-8 rounded-lg shadow-sm transition-all flex items-center gap-2"
            >
              <span v-if="isResettingDevice" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              重設打卡裝置
            </button>
            <p class="text-sm text-gray-500 mt-2">此操作將清除員工的打卡裝置綁定，需重新綁定。</p>
          </div>

          <!-- 儲存與取消按鈕 -->
          <div class="pt-4 border-t border-gray-50 flex justify-end gap-3">
            <button 
              @click="router.back()"
              :disabled="isSaving || isResettingDevice"
              class="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all"
            >
              返回
            </button>
            <button 
              @click="handleUpdateEmployee"
              :disabled="isSaving || isResettingDevice"
              class="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2.5 px-8 rounded-lg shadow-sm transition-all flex items-center gap-2"
            >
              <span v-if="isSaving" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              儲存變更
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>