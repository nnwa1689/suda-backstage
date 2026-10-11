<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { getActiveEmployeesApi, type Employee } from '../api/employee';
import { getActiveDepartmentsApi } from '../api/department';
import { getShiftTemplatesApi, formatShiftTime, type ShiftTemplate } from '../api/shiftTemplate';
import {
  getSchedulesApi,
  createScheduleApi,
  updateScheduleApi,
  deleteScheduleApi,
  type EmployeeSchedule,
  type ScheduleType
} from '../api/schedule';
import { getErrorMessage } from '../api/client';

const employees = ref<Employee[]>([]);
const departments = ref<{ id: string; name: string }[]>([]);
const templates = ref<ShiftTemplate[]>([]);
const schedules = ref<EmployeeSchedule[]>([]);

const keyword = ref('');
const deptFilter = ref('');
const selectedEmployee = ref<Employee | null>(null);

const pad = (n: number) => n.toString().padStart(2, '0');
const today = new Date();
const month = ref(`${today.getFullYear()}-${pad(today.getMonth() + 1)}`); // YYYY-MM

const isLoadingEmployees = ref(false);
const isLoadingSchedules = ref(false);
const isSaving = ref(false);

// 編輯視窗
const isModalOpen = ref(false);
const editingId = ref<string | null>(null);
const form = reactive({
  scheduleType: 'daily' as ScheduleType,
  scheduleDate: '',
  scheduleMonth: '',
  shiftTemplateId: ''
});

const filteredEmployees = computed(() => {
  const kw = keyword.value.trim().toLowerCase();
  return employees.value.filter(emp =>
    (!deptFilter.value || emp.department_id === deptFilter.value) &&
    (!kw || emp.name.toLowerCase().includes(kw) || emp.id.toLowerCase().includes(kw))
  );
});

const activeTemplates = computed(() => templates.value.filter(t => t.is_active));
// 編輯時保留原本已停用的班別選項
const selectableTemplates = computed(() => templates.value.filter(t => t.is_active || t.id === form.shiftTemplateId));

// 固定班別排在最前面，其餘依日期排序
const sortedSchedules = computed(() =>
  [...schedules.value].sort((a, b) => {
    if (a.schedule_type !== b.schedule_type) return a.schedule_type === 'fixed' ? -1 : 1;
    return a.schedule_date.localeCompare(b.schedule_date);
  })
);

const monthRange = computed(() => {
  const [y = 0, m = 0] = month.value.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return { startDate: `${month.value}-01`, endDate: `${month.value}-${pad(lastDay)}` };
});

const fetchBaseData = async () => {
  isLoadingEmployees.value = true;
  try {
    const [empRes, deptRes, tplRes] = await Promise.all([
      getActiveEmployeesApi(),
      getActiveDepartmentsApi(),
      getShiftTemplatesApi()
    ]);
    if (empRes.success && empRes.data) {
      // 員工列表 API 為分頁格式 { data, meta }
      employees.value = 'data' in empRes.data ? (empRes.data as any).data : (empRes.data as Employee[]);
    }
    if (deptRes.success) departments.value = deptRes.data;
    if (tplRes.success) templates.value = tplRes.data;
  } catch (error) {
    console.error('載入資料失敗:', error);
  } finally {
    isLoadingEmployees.value = false;
  }
};

const fetchSchedules = async () => {
  if (!selectedEmployee.value) return;
  isLoadingSchedules.value = true;
  try {
    const res = await getSchedulesApi({
      employeeId: selectedEmployee.value.id,
      ...monthRange.value,
      page: 1,
      limit: 200
    });
    if (res.success) schedules.value = res.data;
  } catch (error) {
    console.error('取得排班失敗:', error);
    schedules.value = [];
  } finally {
    isLoadingSchedules.value = false;
  }
};

const selectEmployee = (emp: Employee) => {
  selectedEmployee.value = emp;
  fetchSchedules();
};

const openCreate = () => {
  editingId.value = null;
  Object.assign(form, {
    scheduleType: 'daily',
    scheduleDate: monthRange.value.startDate,
    scheduleMonth: month.value,
    shiftTemplateId: activeTemplates.value[0]?.id ?? ''
  });
  isModalOpen.value = true;
};

const openEdit = (s: EmployeeSchedule) => {
  editingId.value = s.id;
  Object.assign(form, {
    scheduleType: s.schedule_type,
    scheduleDate: s.schedule_date,
    scheduleMonth: s.schedule_date.slice(0, 7),
    shiftTemplateId: s.shift_template_id
  });
  isModalOpen.value = true;
};

const handleSave = async () => {
  if (!selectedEmployee.value) return;
  if (!form.shiftTemplateId) return alert('請選擇班別');
  // 固定班別以該月 1 號代表整月
  const scheduleDate = form.scheduleType === 'fixed' ? `${form.scheduleMonth}-01` : form.scheduleDate;
  if (!scheduleDate || scheduleDate.length !== 10) return alert('請選擇排班日期');

  const payload = {
    employeeId: selectedEmployee.value.id,
    scheduleDate,
    shiftTemplateId: form.shiftTemplateId,
    scheduleType: form.scheduleType
  };

  isSaving.value = true;
  try {
    const res = editingId.value
      ? await updateScheduleApi(editingId.value, payload)
      : await createScheduleApi(payload);
    if (res.success) {
      isModalOpen.value = false;
      await fetchSchedules();
    }
  } catch (error) {
    alert(getErrorMessage(error, '儲存失敗，請稍後再試'));
  } finally {
    isSaving.value = false;
  }
};

const handleDelete = async (s: EmployeeSchedule) => {
  if (!confirm(`確定要刪除 ${s.schedule_date} 的排班嗎？`)) return;
  try {
    await deleteScheduleApi(s.id);
    await fetchSchedules();
  } catch (error) {
    alert(getErrorMessage(error, '刪除失敗，請稍後再試'));
  }
};

const templateLabel = (s: EmployeeSchedule) => {
  const t = s.template ?? templates.value.find(t => t.id === s.shift_template_id);
  return t ? `${t.name} (${formatShiftTime(t)})` : s.shift_template_id;
};

const weekday = (date: string) => ['日', '一', '二', '三', '四', '五', '六'][new Date(`${date}T00:00:00`).getDay()];

onMounted(fetchBaseData);
</script>

<template>
  <div class="max-w-7xl mx-auto p-6">
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-gray-900">個別排班</h1>
      <p class="text-gray-500 mt-1">選擇員工後編輯其班表。固定排班 (fixed) 套用整月，每日排班 (daily) 優先於固定排班。</p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- 員工清單 -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col max-h-[75vh]">
        <div class="p-4 border-b border-gray-100 space-y-3">
          <input v-model="keyword" type="text" placeholder="搜尋姓名或員工編號"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          <select v-model="deptFilter" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="">全部部門</option>
            <option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</option>
          </select>
        </div>
        <div v-if="isLoadingEmployees" class="flex justify-center py-10">
          <span class="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></span>
        </div>
        <ul v-else class="flex-1 overflow-y-auto divide-y divide-gray-100">
          <li v-if="filteredEmployees.length === 0" class="p-6 text-center text-gray-500 text-sm">查無員工</li>
          <li v-for="emp in filteredEmployees" :key="emp.id">
            <button @click="selectEmployee(emp)"
              :class="['w-full text-left px-4 py-3 transition-colors', selectedEmployee?.id === emp.id ? 'bg-blue-50' : 'hover:bg-gray-50']">
              <div class="text-sm font-medium text-gray-900">{{ emp.name }}</div>
              <div class="text-xs text-gray-500">{{ emp.id }}・{{ emp.department?.name ?? emp.department_id }}</div>
            </button>
          </li>
        </ul>
      </div>

      <!-- 班表 -->
      <div class="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div v-if="!selectedEmployee" class="p-10 text-center text-gray-500">請從左側選擇員工。</div>
        <div v-else class="p-6 space-y-6">
          <div class="flex flex-wrap justify-between items-center gap-4">
            <div>
              <h2 class="text-lg font-bold text-gray-900">{{ selectedEmployee.name }} 的班表</h2>
              <p class="text-sm text-gray-500">{{ selectedEmployee.id }}</p>
            </div>
            <div class="flex items-center gap-3">
              <input v-model="month" @change="fetchSchedules" type="month"
                class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              <button @click="openCreate" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">+ 新增排班</button>
            </div>
          </div>

          <div v-if="isLoadingSchedules" class="flex justify-center py-10">
            <span class="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></span>
          </div>
          <div v-else-if="sortedSchedules.length === 0" class="text-center py-10 text-gray-500">本月尚無排班。</div>
          <div v-else class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">日期</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">類型</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">班別</th>
                  <th class="relative px-4 py-3"><span class="sr-only">操作</span></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                <tr v-for="s in sortedSchedules" :key="s.id">
                  <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    <template v-if="s.schedule_type === 'fixed'">{{ s.schedule_date.slice(0, 7) }} 整月</template>
                    <template v-else>{{ s.schedule_date }} ({{ weekday(s.schedule_date) }})</template>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap text-sm">
                    <span :class="['px-2 inline-flex text-xs leading-5 font-semibold rounded-full', s.schedule_type === 'fixed' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800']">
                      {{ s.schedule_type === 'fixed' ? '固定' : '每日' }}
                    </span>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{{ templateLabel(s) }}</td>
                  <td class="px-4 py-3 whitespace-nowrap text-right text-sm font-medium space-x-3">
                    <button @click="openEdit(s)" class="text-blue-600 hover:text-blue-900">編輯</button>
                    <button @click="handleDelete(s)" class="text-red-600 hover:text-red-900">刪除</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- 新增 / 編輯視窗 -->
    <div v-if="isModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-5">
        <h2 class="text-lg font-bold text-gray-900">{{ editingId ? '編輯排班' : '新增排班' }}・{{ selectedEmployee?.name }}</h2>

        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">排班類型</label>
          <select v-model="form.scheduleType" class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="daily">每日排班 (daily)</option>
            <option value="fixed">固定排班 (fixed，套用整月)</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">{{ form.scheduleType === 'fixed' ? '排班月份' : '排班日期' }}</label>
          <input v-if="form.scheduleType === 'fixed'" v-model="form.scheduleMonth" type="month"
            class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          <input v-else v-model="form.scheduleDate" type="date"
            class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">班別</label>
          <select v-model="form.shiftTemplateId" class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="" disabled>請選擇班別</option>
            <option v-for="t in selectableTemplates" :key="t.id" :value="t.id">{{ t.id }}・{{ t.name }} ({{ formatShiftTime(t) }}){{ t.is_active ? '' : ' [已停用]' }}</option>
          </select>
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
