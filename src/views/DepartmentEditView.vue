<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getDepartmentByIdApi, updateDepartmentApi, getAllDepartmentsApi, type Department } from '../api/department';
import { getActiveEmployeesApi, type Employee } from '../api/employee';

const route = useRoute();
const router = useRouter();

const departmentId = ref(route.params.id as string);
const department = ref<Department | null>(null);
const activeDepts = ref<{ id: string, name: string }[]>([]);
const activeEmployees = ref<Employee[]>([]);

const isLoading = ref(false);
const isSaving = ref(false);
const fetchError = ref(false);

// 表單欄位
const deptName = ref('');
const parentId = ref('000'); // 預設為頂級部門 000
const managerId = ref('');
const isActive = ref(true);

const fetchData = async () => {
  isLoading.value = true;
  fetchError.value = false;
  try {
    // 同時取得部門詳情、可用部門選單與啟用中員工
    const [deptRes, listRes, empRes] = await Promise.all([
      getDepartmentByIdApi(departmentId.value),
      getAllDepartmentsApi(), // 使用 getAllDepartmentsApi 取得所有部門，確保能選取到已停用的上級部門
      getActiveEmployeesApi()
    ]);

    if (deptRes.success && deptRes.data) {
      department.value = deptRes.data;
      deptName.value = deptRes.data.name;
      parentId.value = deptRes.data.parent_department_id || '000'; // 若無上級，設定為 000
      managerId.value = deptRes.data.manager_id || '';
      isActive.value = deptRes.data.is_active;
    } else {
      fetchError.value = true;
    }

    if (listRes.success) {
      // 過濾掉自己，因為上級部門不能是自己。使用所有部門列表。
      activeDepts.value = listRes.data.filter(d => d.id !== departmentId.value); 
    }

    if (empRes.success && empRes.data) {
      if ('data' in empRes.data) {
        activeEmployees.value = (empRes.data as any).data;
      } else {
        activeEmployees.value = empRes.data as Employee[];
      }
    }
  } catch (error) {
    console.error('載入資料失敗:', error);
    fetchError.value = true;
  } finally {
    isLoading.value = false;
  }
};

const handleSave = async () => {
  if (!deptName.value.trim()) {
    alert('部門名稱不能為空');
    return;
  }

  // 二次驗證上級部門
  if (parentId.value === departmentId.value) {
    alert('上級部門不能設定為自己');
    return;
  }

  isSaving.value = true;
  try {
    const res = await updateDepartmentApi(departmentId.value, {
      name: deptName.value,
      is_active: isActive.value,
      parent_department_id: parentId.value || undefined,
      manager_id: managerId.value || undefined
    });

    if (res.success) {
      alert('部門設定更新成功');
      router.push({ name: 'DepartmentManagement' });
    }
  } catch (error) {
    console.error('更新失敗:', error);
    alert('更新失敗，請稍後再試');
  } finally {
    isSaving.value = false;
  }
};

onMounted(fetchData);
</script>

<template>
  <div class="max-w-4xl mx-auto p-6">
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-gray-900">編輯部門</h1>
      <p class="text-gray-500 mt-1">設定部門名稱、層級與狀態。</p>
    </div>

    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div class="p-6 sm:p-8 space-y-6">
        <div v-if="isLoading" class="flex justify-center py-10">
          <span class="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></span>
        </div>

        <div v-else-if="fetchError" class="text-center py-10">
          <p class="text-red-500 mb-4">無法載入部門資料</p>
          <button @click="fetchData" class="text-blue-600 underline">重新嘗試</button>
        </div>

        <div v-else class="space-y-6">
          <!-- 部門 ID (唯讀) -->
          <div class="max-w-md">
            <label class="block text-sm font-semibold text-gray-700 mb-2">部門 ID</label>
            <input 
              :value="departmentId" 
              type="text" 
              disabled 
              class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-500 cursor-not-allowed"
            />
          </div>

          <!-- 部門名稱 -->
          <div class="max-w-md">
            <label class="block text-sm font-semibold text-gray-700 mb-2">部門名稱</label>
            <input 
              v-model="deptName" 
              type="text" 
              class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <!-- 部門管理者 -->
          <div class="max-w-md">
            <label class="block text-sm font-semibold text-gray-700 mb-2">部門管理者</label>
            <select 
              v-model="managerId" 
              class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              :disabled="isLoading || isSaving"
            >
              <option value="">未指定</option>
              <option v-for="emp in activeEmployees" :key="emp.id" :value="emp.id">
                {{ emp.name }} ({{ emp.id }})
              </option>
            </select>
          </div>

          <!-- 上級部門 -->
          <div class="max-w-md">
            <label class="block text-sm font-semibold text-gray-700 mb-2">上級部門</label>
            <select 
              v-model="parentId" 
              class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="000">無 (作為頂級部門)</option>
              <option v-for="dept in activeDepts" :key="dept.id" :value="dept.id">
                {{ dept.name }}
              </option>
            </select>
          </div>

          <!-- 啟用狀態 -->
          <div class="flex items-center">
            <input 
              id="dept-active" 
              type="checkbox" 
              v-model="isActive" 
              class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label for="dept-active" class="ml-2 text-sm text-gray-900">啟用此部門</label>
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
              @click="handleSave"
              :disabled="isSaving"
              class="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-8 rounded-lg shadow-sm transition-all flex items-center gap-2"
            >
              <span v-if="isSaving" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              確認儲存
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>