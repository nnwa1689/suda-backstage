<script setup lang="ts">
import { ref, computed } from 'vue';
import { batchImportSchedulesApi, type BatchScheduleRow } from '../api/schedule';
import { getErrorMessage } from '../api/client';

const pad = (n: number) => n.toString().padStart(2, '0');
const today = new Date();
const thisMonth = `${today.getFullYear()}-${pad(today.getMonth() + 1)}`;

const scheduleMonth = ref(thisMonth);

const fileName = ref('');
const rows = ref<BatchScheduleRow[]>([]);
const parseError = ref('');
const resultMessage = ref('');
const errors = ref<string[]>([]);
const isSuccess = ref(false);
const isImporting = ref(false);

const fileInput = ref<HTMLInputElement | null>(null);

// 是否循環班別欄位顯示用 (實際驗證於後端)
const cyclicLabel = (value: string) => {
  const v = value.trim().toLowerCase();
  if (['y', 'yes', '是', 'true', '1'].includes(v)) return '循環 (整月固定)';
  if (['n', 'no', '否', 'false', '0'].includes(v)) return '非循環 (每日)';
  return `無法辨識：${value}`;
};

const cyclicCount = computed(() => rows.value.filter(r => cyclicLabel(r.isCyclic).startsWith('循環')).length);

/**
 * 簡易 CSV 解析 (支援雙引號包覆與跳脫)
 */
const parseCsv = (text: string): string[][] => {
  const result: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); result.push(row); row = []; field = '';
    } else field += c;
  }
  if (field !== '' || row.length > 0) { row.push(field); result.push(row); }
  return result.filter(r => r.some(f => f.trim() !== ''));
};

/**
 * 讀取檔案：先以 UTF-8 解碼，出現亂碼時改用 Big5 (Excel 另存 CSV 常見)
 */
const decodeFile = async (file: File) => {
  const buffer = await file.arrayBuffer();
  const utf8 = new TextDecoder('utf-8').decode(buffer);
  const text = utf8.includes('\uFFFD') ? new TextDecoder('big5').decode(buffer) : utf8;
  return text.replace(/^\uFEFF/, '');
};

const handleFileChange = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  rows.value = [];
  parseError.value = '';
  resultMessage.value = '';
  errors.value = [];
  if (!file) return;
  fileName.value = file.name;

  try {
    const data = parseCsv(await decodeFile(file));
    // 第一列若為標題列 (含「部門」或「員工」等文字) 則略過
    if (data[0] && /部門|員工|班別|department|employee|shift/i.test(data[0].join(','))) {
      data.shift();
    }
    const invalid = data.findIndex(r => r.length < 4);
    if (invalid >= 0) {
      parseError.value = `第 ${invalid + 1} 筆欄位數不足，需包含：部門、員工編號、班別代碼、是否循環班別。`;
      return;
    }
    rows.value = data.map(([departmentId = '', employeeId = '', shiftTemplateId = '', isCyclic = '']) => ({
      departmentId: departmentId.trim(),
      employeeId: employeeId.trim(),
      shiftTemplateId: shiftTemplateId.trim(),
      isCyclic: isCyclic.trim()
    }));
    if (rows.value.length === 0) parseError.value = '檔案中沒有資料。';
  } catch (error) {
    console.error('解析 CSV 失敗:', error);
    parseError.value = '無法解析檔案，請確認為 CSV 格式。';
  }
};

const resetFile = () => {
  rows.value = [];
  fileName.value = '';
  if (fileInput.value) fileInput.value.value = '';
};

const handleImport = async () => {
  if (rows.value.length === 0) return alert('請先選擇 CSV 檔案');
  if (!scheduleMonth.value) return alert('請選擇匯入月份');
  if (!confirm(`確定匯入 ${scheduleMonth.value} 的班表共 ${rows.value.length} 筆資料嗎？`)) return;

  isImporting.value = true;
  resultMessage.value = '';
  errors.value = [];
  try {
    const res = await batchImportSchedulesApi({
      month: scheduleMonth.value,
      rows: rows.value
    });
    if (res.success) {
      isSuccess.value = true;
      resultMessage.value = res.message || '匯入成功';
      resetFile();
    }
  } catch (error: any) {
    isSuccess.value = false;
    resultMessage.value = getErrorMessage(error, '匯入失敗，請稍後再試');
    errors.value = error?.response?.data?.errors ?? [];
  } finally {
    isImporting.value = false;
  }
};

const downloadTemplate = () => {
  const content = '\uFEFF部門,員工編號,班別代碼,是否循環班別\nD001,E0001,DAY,Y\nD001,E0002,NIGHT,N\n';
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = '批次排班範本.csv';
  a.click();
  URL.revokeObjectURL(url);
};

</script>

<template>
  <div class="max-w-5xl mx-auto p-6">
    <div class="mb-8 flex justify-between items-end">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">批次排班</h1>
        <p class="text-gray-500 mt-1">每次匯入一個月的班表。循環班別套用整月 (fixed)，非循環班別則於該月每天各建立一筆 (daily)。任一筆資料不存在或衝突時，整批不會匯入。</p>
      </div>
      <button @click="downloadTemplate" class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2">
        <span class="material-icons-round text-base">download</span>
        下載範本
      </button>
    </div>

    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 space-y-6">
      <div class="max-w-xs">
        <label class="block text-sm font-semibold text-gray-700 mb-2">匯入月份</label>
        <input v-model="scheduleMonth" type="month" class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
      </div>

      <div>
        <label class="block text-sm font-semibold text-gray-700 mb-2">CSV 檔案</label>
        <input ref="fileInput" type="file" accept=".csv,text/csv" @change="handleFileChange"
          class="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
        <p class="text-xs text-gray-500 mt-2">欄位順序：部門 (代碼或名稱)、員工編號、班別代碼、是否循環班別 (Y/N)。第一列可為標題列。</p>
        <p v-if="parseError" class="text-sm text-red-600 mt-2">{{ parseError }}</p>
      </div>

      <!-- 匯入結果 -->
      <div v-if="resultMessage" :class="['rounded-lg p-4 text-sm', isSuccess ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800']">
        <p class="font-semibold whitespace-pre-line">{{ resultMessage }}</p>
        <ul v-if="errors.length" class="mt-2 list-disc list-inside space-y-1 max-h-64 overflow-y-auto">
          <li v-for="(err, i) in errors" :key="i">{{ err }}</li>
        </ul>
      </div>

      <!-- 預覽 -->
      <div v-if="rows.length > 0">
        <div class="flex justify-between items-center mb-3">
          <h2 class="text-sm font-semibold text-gray-700">預覽：{{ fileName }} (共 {{ rows.length }} 筆，循環 {{ cyclicCount }} 筆)</h2>
        </div>
        <div class="overflow-x-auto max-h-96 border border-gray-100 rounded-lg">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50 sticky top-0">
              <tr>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500">筆</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500">部門</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500">員工編號</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500">班別代碼</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500">是否循環班別</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="(r, i) in rows" :key="i">
                <td class="px-4 py-2 text-sm text-gray-400">{{ i + 1 }}</td>
                <td class="px-4 py-2 text-sm text-gray-900">{{ r.departmentId }}</td>
                <td class="px-4 py-2 text-sm text-gray-900">{{ r.employeeId }}</td>
                <td class="px-4 py-2 text-sm text-gray-900">{{ r.shiftTemplateId }}</td>
                <td :class="['px-4 py-2 text-sm', cyclicLabel(r.isCyclic).startsWith('無法') ? 'text-red-600' : 'text-gray-900']">{{ cyclicLabel(r.isCyclic) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="pt-6 border-t border-gray-100 flex justify-end">
        <button @click="handleImport" :disabled="isImporting || rows.length === 0"
          class="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-8 rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
          <span v-if="isImporting" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          驗證並匯入
        </button>
      </div>
    </div>
  </div>
</template>
