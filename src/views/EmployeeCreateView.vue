<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { createEmployeeApi } from '../api/employee';
import { registerUserAccountApi } from '../api/user'; // 引入新的 user API
import { getActiveDepartmentsApi, type Department } from '../api/department'; 

const router = useRouter();

const departments = ref<Department[]>([]);
const isLoading = ref(false);
const isSaving = ref(false);

// 表單資料
const employeeId = ref('');
const employeeName = ref('');
const selectedDepartmentId = ref('');
const password = ref(''); // 新增密碼欄位
const arrivalDate = ref(new Date().toISOString().split('T')[0]); // 預設今日
const isActive = ref(true);

// 取得部門選單
const fetchDepartments = async () => {
  isLoading.value = true;
  try {
    const res = await getActiveDepartmentsApi();
    if (res.success && res.data) {
      departments.value = res.data;
    }
  } catch (error) {
    console.error('取得部門列表失敗:', error);
  } finally {
    isLoading.value = false;
  }
};

const handleCreate = async () => {
  if (!employeeId.value.trim()) return alert('請輸入員工 ID');
  if (!employeeName.value.trim()) return alert('請輸入員工姓名');
  if (!selectedDepartmentId.value) return alert('請選擇部門');
  if (!password.value) return alert('請輸入密碼');
  if (password.value.length < 6) return alert('密碼長度至少需要 6 個字元');

  isSaving.value = true;
  try {
    const payload = {
      id: employeeId.value.trim(),
      name: employeeName.value.trim(),
      departmentId: selectedDepartmentId.value,
      isActive: isActive.value,
      arrival: new Date(arrivalDate.value).toISOString()
    };

    const res = await createEmployeeApi(payload);
    if (res.success && res.data) {
      // 員工資料建立成功後，接著建立使用者帳號
      const userPayload = {
        username: employeeId.value.trim(), // 帳號與員工編號ID相同
        password: password.value,
        employeeId: res.data.id // 使用後端回傳的員工 ID
      };
      const userRes = await registerUserAccountApi(userPayload);
      if (userRes.success) {
        alert('員工與帳號建立成功！');
        router.push({ name: 'EmployeeManagement' });
      } else {
        // 如果帳號建立失敗，可以考慮是否要回滾員工資料，或者僅提示帳號建立失敗
        alert(`員工資料已建立，但帳號建立失敗：${userRes.message || '未知錯誤'}`);
      }
    } else {
      alert(`建立員工失敗：${res.message || '未知錯誤'}`);
    }
  } catch (error: any) {
    console.error('建立員工失敗:', error);
    alert(error.response?.data?.message || '建立失敗，請稍後再試');
  } finally {
    isSaving.value = false;
  }
};

onMounted(fetchDepartments);
</script>

<template>
  <div class="max-w-4xl mx-auto p-6">
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-gray-900">新增員工</h1>
      <p class="text-gray-500 mt-1">在系統中建立新的員工帳號。</p>
    </div>

    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div class="p-6 sm:p-8 space-y-6">
        <div class="space-y-6">
          <!-- 員工 ID -->
          <div class="max-w-md">
            <label class="block text-sm font-semibold text-gray-700 mb-2">員工 ID <span class="text-red-500">*</span></label>
            <input 
              v-model="employeeId" 
              type="text" 
              placeholder="例如：EMP001"
              class="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all disabled:bg-gray-50"
              :disabled="isSaving"
            />
          </div>

          <!-- 員工姓名 -->
          <div class="max-w-md">
            <label class="block text-sm font-semibold text-gray-700 mb-2">員工姓名 <span class="text-red-500">*</span></label>
            <input 
              v-model="employeeName" 
              type="text" 
              placeholder="請輸入姓名"
              class="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all disabled:bg-gray-50"
              :disabled="isSaving"
            />
          </div>

          <!-- 所屬部門 -->
          <div class="max-w-md">
            <label class="block text-sm font-semibold text-gray-700 mb-2">所屬部門 <span class="text-red-500">*</span></label>
            <select 
              v-model="selectedDepartmentId" 
              class="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all disabled:bg-gray-50"
              :disabled="isLoading || isSaving"
            >
              <option value="" disabled>請選擇部門</option>
              <option v-for="dept in departments" :key="dept.id" :value="dept.id">
                {{ dept.name }}
              </option>
            </select>
          </div>

          <!-- 密碼 -->
          <div class="max-w-md">
            <label class="block text-sm font-semibold text-gray-700 mb-2">密碼 <span class="text-red-500">*</span></label>
            <input 
              v-model="password" 
              type="password" 
              placeholder="請設定登入密碼 (至少6個字元)"
              class="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all disabled:bg-gray-50"
              :disabled="isSaving"
            />
            <p class="text-xs text-gray-500 mt-1">員工登入帳號將與員工 ID 相同。</p>
          </div>

          <!-- 到職日 -->
          <div class="max-w-md">
            <label class="block text-sm font-semibold text-gray-700 mb-2">到職日期</label>
            <input 
              v-model="arrivalDate" 
              type="date" 
              class="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all disabled:bg-gray-50"
              :disabled="isSaving"
            />
          </div>

          <!-- 狀態 -->
          <div class="flex items-center">
            <input 
              id="employee-active" 
              type="checkbox" 
              v-model="isActive" 
              class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              :disabled="isSaving"
            />
            <label for="employee-active" class="ml-2 text-sm text-gray-900">帳號啟用中</label>
          </div>

          <div class="pt-6 border-t border-gray-100 flex justify-end gap-3">
            <button 
              @click="router.back()"
              :disabled="isSaving"
              class="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all"
            >
              返回
            </button>
            <button 
              @click="handleCreate"
              :disabled="isSaving"
              class="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-8 rounded-lg shadow-sm transition-all flex items-center gap-2"
            >
              <span v-if="isSaving" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              建立員工
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>