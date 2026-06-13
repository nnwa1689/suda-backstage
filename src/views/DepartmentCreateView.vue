<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { createDepartmentApi, getActiveDepartmentsApi } from '../api/department';
import { getActiveEmployeesApi, type Employee } from '../api/employee';

const router = useRouter();

const activeDepts = ref<{ id: string, name: string }[]>([]);
const activeEmployees = ref<Employee[]>([]);
const isLoading = ref(false);
const isSaving = ref(false);

// 表單欄位
const deptId = ref('');
const deptName = ref('');
const parentId = ref('000'); // 預設為頂級部門 000
const managerId = ref('');

const fetchData = async () => {
  isLoading.value = true;
  try {
    const [deptRes, empRes] = await Promise.all([
      getActiveDepartmentsApi(),
      getActiveEmployeesApi()
    ]);
    
    if (deptRes.success) activeDepts.value = deptRes.data;
    if (empRes.success && empRes.data) {
      // 處理分頁結構或扁平陣列
      if ('data' in empRes.data) {
        activeEmployees.value = (empRes.data as any).data;
      } else {
        activeEmployees.value = empRes.data as Employee[];
      }
    }
  } catch (error) {
    console.error('載入初始化資料失敗:', error);
  } finally {
    isLoading.value = false;
  }
};

const handleCreate = async () => {
  if (!deptId.value.trim()) {
    alert('部門 ID 不能為空');
    return;
  }
  if (!deptName.value.trim()) {
    alert('部門名稱不能為空');
    return;
  }

  isSaving.value = true;
  try {
    const res = await createDepartmentApi({
      id: deptId.value.trim(),
      name: deptName.value.trim(),
      parent_department_id: parentId.value,
      manager_id: managerId.value || undefined
    });

    if (res.success) {
      alert('部門建立成功');
      router.push({ name: 'DepartmentManagement' });
    }
  } catch (error) {
    console.error('建立部門失敗:', error);
    alert('建立失敗，請檢查輸入內容或稍後再試');
  } finally {
    isSaving.value = false;
  }
};

onMounted(fetchData);
</script>

<template>
  <div class="max-w-4xl mx-auto p-6">
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-gray-900">建立新部門</h1>
      <p class="text-gray-500 mt-1">在組織架構中新增一個部門。</p>
    </div>

    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div class="p-6 sm:p-8 space-y-6">
        <div class="space-y-6">
          <!-- 部門 ID -->
          <div class="max-w-md">
            <label class="block text-sm font-semibold text-gray-700 mb-2">部門 ID <span class="text-red-500">*</span></label>
            <input 
              v-model="deptId" 
              type="text" 
              placeholder="例如：DEPT_001"
              class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              :disabled="isSaving"
            />
          </div>

          <!-- 部門名稱 -->
          <div class="max-w-md">
            <label class="block text-sm font-semibold text-gray-700 mb-2">部門名稱 <span class="text-red-500">*</span></label>
            <input 
              v-model="deptName" 
              type="text" 
              placeholder="例如：研發部"
              class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              :disabled="isSaving"
            />
          </div>

          <!-- 部門管理者 -->
          <div class="max-w-md">
            <label class="block text-sm font-semibold text-gray-700 mb-2">部門管理者</label>
            <select 
              v-model="managerId" 
              class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
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
              class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              :disabled="isLoading || isSaving"
            >
              <option value="000">無 (作為頂級部門)</option>
              <option v-for="dept in activeDepts" :key="dept.id" :value="dept.id">
                {{ dept.name }}
              </option>
            </select>
            <p class="text-xs text-gray-400 mt-1">若此部門不屬於任何其他部門，請選擇「無」。</p>
          </div>

          <div class="pt-6 border-t border-gray-100 flex justify-end gap-3">
            <button 
              @click="router.back()"
              class="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all"
              :disabled="isSaving"
            >
              返回
            </button>
            <button 
              @click="handleCreate"
              :disabled="isSaving"
              class="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-8 rounded-lg shadow-sm transition-all flex items-center gap-2"
            >
              <span v-if="isSaving" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              建立部門
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>