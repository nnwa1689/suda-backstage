<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import {
  getPunchRecordsApi,
  createPunchRecordApi,
  updatePunchRecordApi,
  deletePunchRecordApi,
  type PunchRecord,
  type PunchRecordPayload
} from '../api/punch';
import { getActiveEmployeesApi, type Employee } from '../api/employee';
import { getActiveDepartmentsApi } from '../api/department';
import { getPunchPointsApi, type PunchPoint } from '../api/punchPoint';
import { getErrorMessage } from '../api/client';

const pad = (n: number) => n.toString().padStart(2, '0');
const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
// ISO 字串轉為 datetime-local 輸入格式 (本地時間)
const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  return `${toDateStr(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const today = new Date();
const filters = reactive({
  startDate: toDateStr(new Date(today.getFullYear(), today.getMonth(), 1)),
  endDate: toDateStr(today),
  employeeId: '',
  departmentId: ''
});

const records = ref<PunchRecord[]>([]);
const employees = ref<Employee[]>([]);
const departments = ref<{ id: string; name: string }[]>([]);
const punchPoints = ref<PunchPoint[]>([]);

const page = ref(1);
const limit = 20;
// all-records 未回傳總筆數，以本頁是否滿筆判斷是否有下一頁
const hasNextPage = ref(false);
const isLoading = ref(false);
const isSaving = ref(false);

// 遲到/早退：auto 表示交由後端依排班計算
type FlagMode = 'auto' | 'true' | 'false';

const isModalOpen = ref(false);
const editingId = ref<string | null>(null);
const form = reactive({
  employeeId: '',
  punchTime: '',
  punchType: 'CHECK_IN' as 'CHECK_IN' | 'CHECK_OUT',
  punchPointsId: '',
  isLate: 'auto' as FlagMode,
  isEarly: 'auto' as FlagMode,
  remark: ''
});

const filteredEmployees = computed(() =>
  employees.value.filter(e => !filters.departmentId || e.department_id === filters.departmentId)
);

const fetchBaseData = async () => {
  try {
    const [empRes, deptRes, ppRes] = await Promise.all([
      getActiveEmployeesApi(),
      getActiveDepartmentsApi(),
      getPunchPointsApi()
    ]);
    if (empRes.success && empRes.data) {
      employees.value = 'data' in empRes.data ? (empRes.data as any).data : (empRes.data as Employee[]);
    }
    if (deptRes.success) departments.value = deptRes.data;
    if (ppRes.success) punchPoints.value = ppRes.data;
  } catch (error) {
    console.error('載入資料失敗:', error);
  }
};

const fetchRecords = async () => {
  if (!filters.startDate || !filters.endDate) return alert('請選擇查詢日期區間');
  isLoading.value = true;
  try {
    const res = await getPunchRecordsApi({
      startDate: filters.startDate,
      endDate: filters.endDate,
      employeeId: filters.employeeId || undefined,
      departmentId: filters.departmentId || undefined,
      page: String(page.value),
      limit: String(limit)
    });
    if (res.success) {
      records.value = res.data;
      hasNextPage.value = records.value.length === limit;
    }
  } catch (error) {
    alert(getErrorMessage(error, '查詢打卡紀錄失敗'));
  } finally {
    isLoading.value = false;
  }
};

const search = () => {
  page.value = 1;
  fetchRecords();
};

const goToPage = (p: number) => {
  if (p < 1) return;
  page.value = p;
  fetchRecords();
};

const openCreate = () => {
  editingId.value = null;
  Object.assign(form, {
    employeeId: filters.employeeId || '',
    punchTime: toLocalInput(new Date().toISOString()),
    punchType: 'CHECK_IN',
    punchPointsId: punchPoints.value.find(p => p.is_active)?.id ?? '',
    isLate: 'auto',
    isEarly: 'auto',
    remark: '後台補登'
  });
  isModalOpen.value = true;
};

const openEdit = (r: PunchRecord) => {
  editingId.value = r.id;
  Object.assign(form, {
    employeeId: r.employee_id.trim(),
    punchTime: toLocalInput(r.punch_time),
    punchType: r.punch_type,
    punchPointsId: r.punch_points_id.trim(),
    isLate: String(r.is_late) as FlagMode,
    isEarly: String(r.is_early) as FlagMode,
    remark: r.remark?.trim() ?? ''
  });
  isModalOpen.value = true;
};

const flagValue = (mode: FlagMode) => (mode === 'auto' ? undefined : mode === 'true');

const handleSave = async () => {
  if (!form.employeeId) return alert('請選擇員工');
  if (!form.punchTime) return alert('請輸入打卡時間');
  if (!form.punchPointsId) return alert('請選擇打卡點');

  const payload: PunchRecordPayload = {
    employeeId: form.employeeId,
    punchTime: new Date(form.punchTime).toISOString(),
    punchType: form.punchType,
    punchPointsId: form.punchPointsId,
    isLate: flagValue(form.isLate),
    isEarly: flagValue(form.isEarly),
    remark: form.remark.trim()
  };

  isSaving.value = true;
  try {
    const res = editingId.value
      ? await updatePunchRecordApi(editingId.value, payload)
      : await createPunchRecordApi(payload);
    if (res.success) {
      isModalOpen.value = false;
      await fetchRecords();
    }
  } catch (error) {
    alert(getErrorMessage(error, '儲存失敗，請稍後再試'));
  } finally {
    isSaving.value = false;
  }
};

const handleDelete = async (r: PunchRecord) => {
  const name = r.employee?.name ?? r.employee_id;
  if (!confirm(`確定要刪除 ${name} 於 ${formatDateTime(r.punch_time)} 的打卡紀錄嗎？此動作無法復原。`)) return;
  try {
    await deletePunchRecordApi(r.id);
    await fetchRecords();
  } catch (error) {
    alert(getErrorMessage(error, '刪除失敗，請稍後再試'));
  }
};

const formatDateTime = (iso: string) => new Date(iso).toLocaleString('zh-TW', { hour12: false });

const getStatus = (r: PunchRecord) => {
  if (r.punch_type === 'CHECK_IN') {
    return r.is_late ? { label: '遲到', class: 'bg-orange-100 text-orange-800' } : { label: '準時', class: 'bg-green-100 text-green-800' };
  }
  return r.is_early ? { label: '早退', class: 'bg-red-100 text-red-800' } : { label: '正常', class: 'bg-green-100 text-green-800' };
};

onMounted(async () => {
  await fetchBaseData();
  fetchRecords();
});
</script>

<template>
  <div class="max-w-7xl mx-auto p-6">
    <div class="mb-8 flex justify-between items-end">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">打卡紀錄調整</h1>
        <p class="text-gray-500 mt-1">查詢、補登、修改或刪除員工打卡紀錄。</p>
      </div>
      <button @click="openCreate" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">+ 補登打卡</button>
    </div>

    <!-- 查詢條件 -->
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">開始日期</label>
          <input v-model="filters.startDate" type="date" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">結束日期</label>
          <input v-model="filters.endDate" type="date" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">部門</label>
          <select v-model="filters.departmentId" @change="filters.employeeId = ''" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="">全部部門</option>
            <option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">員工</label>
          <select v-model="filters.employeeId" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="">全部員工</option>
            <option v-for="e in filteredEmployees" :key="e.id" :value="e.id">{{ e.name }} ({{ e.id }})</option>
          </select>
        </div>
        <button @click="search" class="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-lg">查詢</button>
      </div>
    </div>

    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div class="p-6">
        <div v-if="isLoading" class="flex justify-center items-center py-10">
          <span class="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></span>
          <p class="ml-3 text-gray-600">載入中...</p>
        </div>
        <div v-else-if="records.length === 0" class="text-center py-10 text-gray-500">查無打卡紀錄。</div>
        <div v-else class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">打卡時間</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">員工</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">類別</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">狀態</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">打卡點</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">備註</th>
                <th class="relative px-4 py-3"><span class="sr-only">操作</span></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr v-for="r in records" :key="r.id">
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{{ formatDateTime(r.punch_time) }}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                  <div>{{ r.employee?.name ?? '-' }}</div>
                  <div class="text-xs text-gray-400">{{ r.employee_id }}</div>
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{{ r.punch_type === 'CHECK_IN' ? '上班' : '下班' }}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm">
                  <span :class="['px-2 inline-flex text-xs leading-5 font-semibold rounded-full', getStatus(r).class]">{{ getStatus(r).label }}</span>
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{{ r.punchPoint?.name ?? r.punch_points_id }}</td>
                <td class="px-4 py-3 text-sm text-gray-500 max-w-xs truncate" :title="r.remark ?? ''">{{ r.remark || '-' }}</td>
                <td class="px-4 py-3 whitespace-nowrap text-right text-sm font-medium space-x-3">
                  <button @click="openEdit(r)" class="text-blue-600 hover:text-blue-900">編輯</button>
                  <button @click="handleDelete(r)" class="text-red-600 hover:text-red-900">刪除</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <nav v-if="!isLoading && (page > 1 || hasNextPage)" class="pt-4 mt-4 border-t border-gray-200 flex justify-end items-center gap-3">
          <button @click="goToPage(page - 1)" :disabled="page === 1"
            class="px-4 py-2 border border-gray-300 text-sm rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">上一頁</button>
          <span class="text-sm text-gray-500">第 {{ page }} 頁</span>
          <button @click="goToPage(page + 1)" :disabled="!hasNextPage"
            class="px-4 py-2 border border-gray-300 text-sm rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">下一頁</button>
        </nav>
      </div>
    </div>

    <!-- 新增 / 編輯視窗 -->
    <div v-if="isModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <h2 class="text-lg font-bold text-gray-900">{{ editingId ? '編輯打卡紀錄' : '補登打卡紀錄' }}</h2>

        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">員工</label>
          <select v-model="form.employeeId" class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="" disabled>請選擇員工</option>
            <option v-for="e in employees" :key="e.id" :value="e.id">{{ e.name }} ({{ e.id }})</option>
          </select>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">打卡時間</label>
            <input v-model="form.punchTime" type="datetime-local" step="1"
              class="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">打卡類別</label>
            <select v-model="form.punchType" class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="CHECK_IN">上班 (CHECK_IN)</option>
              <option value="CHECK_OUT">下班 (CHECK_OUT)</option>
            </select>
          </div>
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">打卡點</label>
          <select v-model="form.punchPointsId" class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="" disabled>請選擇打卡點</option>
            <option v-for="p in punchPoints" :key="p.id" :value="p.id">{{ p.name }} ({{ p.id }}){{ p.is_active ? '' : ' [已停用]' }}</option>
          </select>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">遲到</label>
            <select v-model="form.isLate" class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="auto">依排班自動判斷</option>
              <option value="true">是</option>
              <option value="false">否</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">早退</label>
            <select v-model="form.isEarly" class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="auto">依排班自動判斷</option>
              <option value="true">是</option>
              <option value="false">否</option>
            </select>
          </div>
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">備註</label>
          <input v-model="form.remark" type="text" maxlength="100" placeholder="例如：忘記打卡補登"
            class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>

        <div class="pt-4 border-t border-gray-100 flex justify-end gap-3">
          <button @click="isModalOpen = false" :disabled="isSaving" class="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">取消</button>
          <button @click="handleSave" :disabled="isSaving" class="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-8 rounded-lg flex items-center gap-2">
            <span v-if="isSaving" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            確認儲存
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
