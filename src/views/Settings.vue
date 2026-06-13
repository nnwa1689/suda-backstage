<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getBaseSettingApi, updateBaseSettingApi } from '../api/common';

const newCompanyName = ref('');
const isSaving = ref(false);
const isLoading = ref(false); // 新增載入狀態

// 1. 頁面載入時取得指定 ID 的系統設定 (company_name)
const fetchSettings = async () => {
  isLoading.value = true;
  try {
    const res = await getBaseSettingApi('company_name');
    if (res.success && res.data) {
      newCompanyName.value = res.data.base_value;
    }
  } catch (error) {
    console.error('取得公司名稱失敗:', error);
  } finally {
    isLoading.value = false;
  }
};
const handleUpdate = async () => {
  if (!newCompanyName.value) return;
  
  isSaving.value = true;
  try {
    const res = await updateBaseSettingApi('company_name', newCompanyName.value);
    if (res.success) {
      alert('系統設定已更新！'); //
      // 可以在這裡通知 Layout 同步更新 (例如透過 Pinia 或 Event Bus)
    }
  } catch (error) {
    alert('更新失敗，請稍後再試'); //
  } finally {
    isSaving.value = false;
  }
};

onMounted(() => {
  fetchSettings();
});
</script>

<template>
  <div class="p-6 bg-white rounded-2xl shadow-sm border border-gray-100 max-w-md">
    <h3 class="font-bold mb-4">修改公司名稱</h3>
    <input 
      v-model="newCompanyName" 
      type="text" 
      class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none mb-4"
      placeholder="請輸入公司名稱..."
      :disabled="isLoading || isSaving"
    />
    <button 
      @click="handleUpdate"
      :disabled="isLoading || isSaving"
      class="bg-primary text-white px-6 py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
    >
      {{ isLoading ? '載入中...' : (isSaving ? '儲存中...' : '確認儲存') }}
    </button>
  </div>
</template>