<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import {
  getShiftTemplatesApi,
  createShiftTemplateApi,
  updateShiftTemplateApi,
  formatShiftTime,
  type ShiftTemplate
} from '../api/shiftTemplate';
import { getErrorMessage } from '../api/client';

const templates = ref<ShiftTemplate[]>([]);
const isLoading = ref(false);
const isSaving = ref(false);

// 編輯視窗狀態，editingId 為 null 表示新增
const isModalOpen = ref(false);
const editingId = ref<string | null>(null);
const form = reactive({
  id: '',
  name: '',
  startTime: '09:00',
  endTime: '18:00',
  isCrossDay: false,
  isActive: true
});

const pad = (n: number) => n.toString().padStart(2, '0');

const fetchTemplates = async () => {
  isLoading.value = true;
  try {
    const res = await getShiftTemplatesApi();
    if (res.success) templates.value = res.data;
  } catch (error) {
    console.error('取得班別列表失敗:', error);
  } finally {
    isLoading.value = false;
  }
};

const openCreate = () => {
  editingId.value = null;
  Object.assign(form, { id: '', name: '', startTime: '09:00', endTime: '18:00', isCrossDay: false, isActive: true });
  isModalOpen.value = true;
};

const openEdit = (t: ShiftTemplate) => {
  editingId.value = t.id;
  Object.assign(form, {
    id: t.id,
    name: t.name,
    startTime: `${pad(t.start_time_h)}:${pad(t.start_time_m)}`,
    endTime: `${pad(t.end_time_h)}:${pad(t.end_time_m)}`,
    isCrossDay: t.is_cross_day,
    isActive: t.is_active
  });
  isModalOpen.value = true;
};

const handleSave = async () => {
  if (!form.id.trim()) return alert('請輸入班別代碼');
  if (!form.name.trim()) return alert('請輸入班別名稱');
  if (!form.startTime || !form.endTime) return alert('請設定上下班時間');

  const [startTimeH = 0, startTimeM = 0] = form.startTime.split(':').map(Number);
  const [endTimeH = 0, endTimeM = 0] = form.endTime.split(':').map(Number);
  const body = {
    name: form.name.trim(),
    isCrossDay: form.isCrossDay,
    startTimeH, startTimeM, endTimeH, endTimeM,
    isActive: form.isActive
  };

  isSaving.value = true;
  try {
    const res = editingId.value
      ? await updateShiftTemplateApi(editingId.value, body)
      : await createShiftTemplateApi({ id: form.id.trim(), ...body });
    if (res.success) {
      isModalOpen.value = false;
      await fetchTemplates();
    }
  } catch (error) {
    alert(getErrorMessage(error, '儲存失敗，請稍後再試'));
  } finally {
    isSaving.value = false;
  }
};

const formatDateTime = (value: string) => value ? new Date(value).toLocaleString('zh-TW', { hour12: false }) : '-';

onMounted(fetchTemplates);
</script>

<template>
  <div class="max-w-6xl mx-auto p-6">
    <div class="mb-8 flex justify-between items-end">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">班別設定</h1>
        <p class="text-gray-500 mt-1">管理上下班時間的班別模板。</p>
      </div>
      <button @click="openCreate" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
        <span>+ 新增班別</span>
      </button>
    </div>

    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div class="p-6 sm:p-8">
        <div v-if="isLoading" class="flex justify-center items-center py-10">
          <span class="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></span>
          <p class="ml-3 text-gray-600">載入中...</p>
        </div>
        <div v-else-if="templates.length === 0" class="text-center py-10 text-gray-500">目前沒有班別資料。</div>
        <div v-else class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">班別代碼</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">班別名稱</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">上下班時間</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">狀態</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">建立 / 更新時間</th>
                <th class="relative px-6 py-3"><span class="sr-only">編輯</span></th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="t in templates" :key="t.id">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ t.id }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{{ t.name }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {{ formatShiftTime(t) }}
                  <span v-if="t.is_cross_day" class="ml-1 px-2 text-xs rounded-full bg-purple-100 text-purple-800">跨日</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                  <span :class="['px-2 inline-flex text-xs leading-5 font-semibold rounded-full', t.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800']">
                    {{ t.is_active ? '啟用中' : '已停用' }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                  <div>{{ formatDateTime(t.created_at) }}</div>
                  <div>{{ formatDateTime(t.updated_at) }}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button @click="openEdit(t)" class="text-blue-600 hover:text-blue-900">編輯</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 新增 / 編輯視窗 -->
    <div v-if="isModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-5">
        <h2 class="text-lg font-bold text-gray-900">{{ editingId ? '編輯班別' : '新增班別' }}</h2>

        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">班別代碼</label>
          <input v-model="form.id" :disabled="!!editingId" type="text" placeholder="例如：D01"
            class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-50 disabled:text-gray-500" />
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">班別名稱</label>
          <input v-model="form.name" type="text" placeholder="例如：日班"
            class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">上班時間</label>
            <input v-model="form.startTime" type="time"
              class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">下班時間</label>
            <input v-model="form.endTime" type="time"
              class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
        </div>
        <div class="flex items-center gap-6">
          <label class="flex items-center text-sm text-gray-900">
            <input v-model="form.isCrossDay" type="checkbox" class="h-4 w-4 text-blue-600 border-gray-300 rounded mr-2" />
            跨日班 (下班時間為隔日)
          </label>
          <label class="flex items-center text-sm text-gray-900">
            <input v-model="form.isActive" type="checkbox" class="h-4 w-4 text-blue-600 border-gray-300 rounded mr-2" />
            啟用此班別
          </label>
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
