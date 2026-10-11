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

// CSV 固定欄位：部門、員工編號、循環班別，其後為 1 ~ 31 日
const FIXED_COLUMNS = 3;
const MAX_DAYS = 31;

// 所選月份的天數與每天的星期
const monthDays = computed(() => {
  const [y = 0, m = 0] = scheduleMonth.value.split('-').map(Number);
  const count = new Date(y, m, 0).getDate();
  return Array.from({ length: count }, (_, i) => {
    const weekday = new Date(y, m - 1, i + 1).getDay();
    return { day: i + 1, weekday: '日一二三四五六'[weekday], isWeekend: weekday === 0 || weekday === 6 };
  });
});

const cyclicCount = computed(() => rows.value.filter(r => r.cyclicShiftTemplateId).length);
const dailyCount = (r: BatchScheduleRow) => r.days.slice(0, monthDays.value.length).filter(Boolean).length;
// 超出本月天數卻有填班別的日期 (後端會拒絕，預覽先標示)
const overflowDays = (r: BatchScheduleRow) =>
  r.days.map((code, i) => (code && i >= monthDays.value.length ? i + 1 : 0)).filter(Boolean);

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
  const text = utf8.includes('�') ? new TextDecoder('big5').decode(buffer) : utf8;
  return text.replace(/^﻿/, '');
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
    if (data[0] && /部門|員工|循環|department|employee/i.test(data[0].join(','))) {
      data.shift();
    }
    const tooShort = data.findIndex(r => r.length < 2);
    if (tooShort >= 0) {
      parseError.value = `第 ${tooShort + 1} 筆欄位數不足，至少需包含：部門、員工編號。`;
      return;
    }
    const tooLong = data.findIndex(r => r.slice(FIXED_COLUMNS + MAX_DAYS).some(v => v.trim()));
    if (tooLong >= 0) {
      parseError.value = `第 ${tooLong + 1} 筆超過 31 日的欄位，請確認欄位順序：部門、員工編號、循環班別、1～31 日。`;
      return;
    }
    rows.value = data.map(([departmentId = '', employeeId = '', cyclic = '', ...days]) => ({
      departmentId: departmentId.trim(),
      employeeId: employeeId.trim(),
      cyclicShiftTemplateId: cyclic.trim() || undefined,
      days: days.slice(0, MAX_DAYS).map(d => d.trim())
    }));
    if (rows.value.length === 0) parseError.value = '檔案中沒有資料。';
  } catch (error) {
    console.error('解析 CSV 失敗:', error);
    parseError.value = '無法解析檔案，請確認為 CSV 格式。';
  }
};

// 去除尾端空白欄位，減少傳輸量
const trimTrailingEmpty = (days: string[]) => {
  let end = days.length;
  while (end > 0 && !days[end - 1]) end--;
  return days.slice(0, end);
};

const resetFile = () => {
  rows.value = [];
  fileName.value = '';
  if (fileInput.value) fileInput.value.value = '';
};

const handleImport = async () => {
  if (rows.value.length === 0) return alert('請先選擇 CSV 檔案');
  if (!scheduleMonth.value) return alert('請選擇匯入月份');
  if (!confirm(`確定匯入 ${scheduleMonth.value} 的班表，共 ${rows.value.length} 位員工嗎？`)) return;

  isImporting.value = true;
  resultMessage.value = '';
  errors.value = [];
  try {
    const res = await batchImportSchedulesApi({
      month: scheduleMonth.value,
      rows: rows.value.map(r => ({ ...r, days: trimTrailingEmpty(r.days) }))
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

// 依所選月份產生範本：一位循環班別 (週末另排)、一位逐日排班 (週末休假)
const downloadTemplate = () => {
  const days = monthDays.value;
  const header = ['部門', '員工編號', '循環班別', ...days.map(d => String(d.day))];
  const cyclicRow = ['D001', 'E0001', 'DAY', ...days.map(() => '')];
  const dailyRow = ['D001', 'E0002', '', ...days.map((d, i) => (d.isWeekend ? '' : i % 2 === 0 ? 'DAY' : 'NIGHT'))];
  const content = '﻿' + [header, cyclicRow, dailyRow].map(r => r.join(',')).join('\n') + '\n';
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `批次排班範本_${scheduleMonth.value}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
</script>

<template>
  <div class="max-w-7xl mx-auto p-6">
    <div class="mb-8 flex justify-between items-end gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">批次排班</h1>
        <p class="text-gray-500 mt-1">以月曆式班表匯入一個月的排班，每位員工一列。任一筆資料不存在或衝突時，整批不會匯入。</p>
      </div>
      <button @click="downloadTemplate" class="shrink-0 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2">
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
        <ul class="text-xs text-gray-500 mt-2 space-y-1 list-disc list-inside">
          <li>欄位順序：部門 (代碼或名稱)、員工編號、循環班別、1 ～ 31 日。第一列可為標題列。</li>
          <li>循環班別：填寫班別代碼則該員工整月套用此班別。</li>
          <li>1 ～ 31 日：填寫當天的班別代碼；有填寫的日子優先於循環班別。未設定循環班別時，空白代表當天不排班。</li>
        </ul>
        <p v-if="parseError" class="text-sm text-red-600 mt-2">{{ parseError }}</p>
      </div>

      <!-- 匯入結果 -->
      <div v-if="resultMessage" :class="['rounded-lg p-4 text-sm', isSuccess ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800']">
        <p class="font-semibold whitespace-pre-line">{{ resultMessage }}</p>
        <ul v-if="errors.length" class="mt-2 list-disc list-inside space-y-1 max-h-64 overflow-y-auto">
          <li v-for="(err, i) in errors" :key="i">{{ err }}</li>
        </ul>
      </div>

      <!-- 預覽 (月曆式) -->
      <div v-if="rows.length > 0">
        <h2 class="text-sm font-semibold text-gray-700 mb-3">
          預覽：{{ fileName }} (共 {{ rows.length }} 位員工，循環班別 {{ cyclicCount }} 位)
        </h2>
        <div class="overflow-auto max-h-[28rem] border border-gray-100 rounded-lg">
          <table class="min-w-full text-xs">
            <thead class="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th class="px-3 py-2 text-left font-medium text-gray-500 sticky left-0 bg-gray-50">筆</th>
                <th class="px-3 py-2 text-left font-medium text-gray-500 whitespace-nowrap">部門</th>
                <th class="px-3 py-2 text-left font-medium text-gray-500 whitespace-nowrap">員工編號</th>
                <th class="px-3 py-2 text-left font-medium text-gray-500 whitespace-nowrap">循環班別</th>
                <th v-for="d in monthDays" :key="d.day"
                  :class="['px-2 py-2 text-center font-medium whitespace-nowrap', d.isWeekend ? 'text-red-400' : 'text-gray-500']">
                  {{ d.day }}<br />{{ d.weekday }}
                </th>
                <th class="px-3 py-2 text-left font-medium text-gray-500 whitespace-nowrap">逐日天數</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="(r, i) in rows" :key="i">
                <td class="px-3 py-2 text-gray-400 sticky left-0 bg-white">{{ i + 1 }}</td>
                <td class="px-3 py-2 text-gray-900 whitespace-nowrap">{{ r.departmentId }}</td>
                <td class="px-3 py-2 text-gray-900 whitespace-nowrap">{{ r.employeeId }}</td>
                <td class="px-3 py-2 whitespace-nowrap">
                  <span v-if="r.cyclicShiftTemplateId" class="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">{{ r.cyclicShiftTemplateId }}</span>
                  <span v-else class="text-gray-300">-</span>
                </td>
                <td v-for="d in monthDays" :key="d.day" :class="['px-2 py-2 text-center whitespace-nowrap', d.isWeekend ? 'bg-red-50/40' : '']">
                  <span v-if="r.days[d.day - 1]" class="text-gray-900 font-medium">{{ r.days[d.day - 1] }}</span>
                  <span v-else-if="r.cyclicShiftTemplateId" class="text-purple-300">{{ r.cyclicShiftTemplateId }}</span>
                  <span v-else class="text-gray-300">·</span>
                </td>
                <td class="px-3 py-2 whitespace-nowrap">
                  {{ dailyCount(r) }} 天
                  <span v-if="overflowDays(r).length" class="text-red-600 ml-1">({{ overflowDays(r).join('、') }} 日超出本月)</span>
                </td>
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
