<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import {
  getPunchPointsApi,
  createPunchPointApi,
  updatePunchPointApi,
  togglePunchPointApi,
  BLUETOOTH_UUID_PATTERN,
  type PunchPoint,
  type PunchVerifyType
} from '../api/punchPoint';
import { getErrorMessage } from '../api/client';

const punchPoints = ref<PunchPoint[]>([]);
const keyword = ref('');
const isLoading = ref(false);
const isSaving = ref(false);

const verifyTypeLabels: Record<PunchVerifyType, string> = {
  GPS: 'GPS 座標',
  WIFI: 'WiFi',
  WFH: '居家辦公',
  Bluetooth: '藍牙'
};

const isModalOpen = ref(false);
const editingId = ref<string | null>(null);
const form = reactive({
  id: '',
  name: '',
  verifyType: 'GPS' as PunchVerifyType,
  latitude: '',
  longitude: '',
  radiusMeters: '100',
  wifiSsid: '',
  wifiBssidText: '', // 每行一個 BSSID
  bluetoothServiceUuid: '',
  isActive: true
});

const fetchPunchPoints = async () => {
  isLoading.value = true;
  try {
    const res = await getPunchPointsApi(keyword.value.trim() || undefined);
    if (res.success) punchPoints.value = res.data;
  } catch (error) {
    console.error('取得打卡點失敗:', error);
  } finally {
    isLoading.value = false;
  }
};

const openCreate = () => {
  editingId.value = null;
  Object.assign(form, {
    id: '', name: '', verifyType: 'GPS', latitude: '', longitude: '', radiusMeters: '100',
    wifiSsid: '', wifiBssidText: '', bluetoothServiceUuid: '', isActive: true
  });
  isModalOpen.value = true;
};

const openEdit = (p: PunchPoint) => {
  editingId.value = p.id;
  Object.assign(form, {
    id: p.id,
    name: p.name,
    verifyType: p.verify_type,
    latitude: String(Number(p.latitude)),
    longitude: String(Number(p.longitude)),
    radiusMeters: String(Number(p.radius_meters)),
    wifiSsid: p.wifi_ssid ?? '',
    wifiBssidText: (p.wifi_bssid_list ?? []).join('\n'),
    bluetoothServiceUuid: p.bluetooth_service_uuid ?? '',
    isActive: p.is_active
  });
  isModalOpen.value = true;
};

// 使用瀏覽器定位帶入目前座標
const useCurrentLocation = () => {
  if (!navigator.geolocation) return alert('此瀏覽器不支援定位');
  navigator.geolocation.getCurrentPosition(
    pos => {
      form.latitude = pos.coords.latitude.toFixed(6);
      form.longitude = pos.coords.longitude.toFixed(6);
    },
    () => alert('無法取得目前位置，請確認定位權限')
  );
};

const handleSave = async () => {
  if (!form.id.trim()) return alert('請輸入打卡點代碼');
  if (!form.name.trim()) return alert('請輸入打卡點名稱');

  const latitude = Number(form.latitude);
  const longitude = Number(form.longitude);
  const radiusMeters = Number(form.radiusMeters);
  if (form.latitude === '' || isNaN(latitude) || latitude < -90 || latitude > 90) return alert('緯度需介於 -90 ~ 90');
  if (form.longitude === '' || isNaN(longitude) || longitude < -180 || longitude > 180) return alert('經度需介於 -180 ~ 180');
  if (!Number.isInteger(radiusMeters) || radiusMeters <= 0) return alert('半徑需為正整數 (公尺)');

  const wifiBssidList = form.wifiBssidText.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
  if (form.verifyType === 'WIFI' && (!form.wifiSsid.trim() || wifiBssidList.length === 0)) {
    return alert('WiFi 驗證需設定 SSID 與至少一個 BSSID');
  }
  const bluetoothServiceUuid = form.bluetoothServiceUuid.trim();
  if (form.verifyType === 'Bluetooth') {
    if (!bluetoothServiceUuid) return alert('藍牙驗證需設定 Service UUID');
    if (!BLUETOOTH_UUID_PATTERN.test(bluetoothServiceUuid)) {
      return alert('藍牙 Service UUID 格式錯誤，需為 4 碼、8 碼或標準 UUID');
    }
  }

  const body = {
    name: form.name.trim(),
    latitude,
    longitude,
    radiusMeters,
    isActive: form.isActive,
    verifyType: form.verifyType,
    wifiSsid: form.wifiSsid.trim(),
    wifiBssidList,
    // 非藍牙類型時清除 Service UUID
    bluetoothServiceUuid: form.verifyType === 'Bluetooth' ? bluetoothServiceUuid : ''
  };

  isSaving.value = true;
  try {
    const res = editingId.value
      ? await updatePunchPointApi(editingId.value, body)
      : await createPunchPointApi({ id: form.id.trim(), ...body });
    if (res.success) {
      isModalOpen.value = false;
      await fetchPunchPoints();
    }
  } catch (error) {
    alert(getErrorMessage(error, '儲存失敗，請稍後再試'));
  } finally {
    isSaving.value = false;
  }
};

// DELETE API 為軟刪除，切換啟用/停用 (保留歷史打卡紀錄的關聯)
const handleToggle = async (p: PunchPoint) => {
  const action = p.is_active ? '停用' : '重新啟用';
  if (!confirm(`確定要${action}打卡點「${p.name}」嗎？`)) return;
  try {
    await togglePunchPointApi(p.id);
    await fetchPunchPoints();
  } catch (error) {
    alert(getErrorMessage(error, `${action}失敗，請稍後再試`));
  }
};

onMounted(fetchPunchPoints);
</script>

<template>
  <div class="max-w-6xl mx-auto p-6">
    <div class="mb-8 flex justify-between items-end">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">打卡點設定</h1>
        <p class="text-gray-500 mt-1">設定允許打卡的地點與驗證方式。</p>
      </div>
      <button @click="openCreate" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">+ 新增打卡點</button>
    </div>

    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div class="p-6 space-y-6">
        <div class="flex gap-3 max-w-md">
          <input v-model="keyword" @keyup.enter="fetchPunchPoints" type="text" placeholder="搜尋代碼或名稱"
            class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          <button @click="fetchPunchPoints" class="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-lg">搜尋</button>
        </div>

        <div v-if="isLoading" class="flex justify-center items-center py-10">
          <span class="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></span>
          <p class="ml-3 text-gray-600">載入中...</p>
        </div>
        <div v-else-if="punchPoints.length === 0" class="text-center py-10 text-gray-500">目前沒有打卡點資料。</div>
        <div v-else class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">代碼</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">名稱</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">驗證方式</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">座標 / 半徑</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">WiFi / 藍牙</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">狀態</th>
                <th class="relative px-4 py-3"><span class="sr-only">操作</span></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr v-for="p in punchPoints" :key="p.id">
                <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{{ p.id }}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{{ p.name }}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{{ verifyTypeLabels[p.verify_type] ?? p.verify_type }}</td>
                <td class="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                  <div>{{ Number(p.latitude) }}, {{ Number(p.longitude) }}</div>
                  <div>半徑 {{ Number(p.radius_meters) }} 公尺</div>
                </td>
                <td class="px-4 py-3 text-xs text-gray-500">
                  <template v-if="p.wifi_ssid">
                    <div>{{ p.wifi_ssid }}</div>
                    <div>{{ p.wifi_bssid_list?.length ?? 0 }} 組 BSSID</div>
                  </template>
                  <div v-if="p.bluetooth_service_uuid" class="font-mono">藍牙 {{ p.bluetooth_service_uuid }}</div>
                  <template v-if="!p.wifi_ssid && !p.bluetooth_service_uuid">-</template>
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-sm">
                  <span :class="['px-2 inline-flex text-xs leading-5 font-semibold rounded-full', p.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800']">
                    {{ p.is_active ? '啟用中' : '已停用' }}
                  </span>
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-right text-sm font-medium space-x-3">
                  <button @click="openEdit(p)" class="text-blue-600 hover:text-blue-900">編輯</button>
                  <button @click="handleToggle(p)" :class="p.is_active ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'">
                    {{ p.is_active ? '刪除 (停用)' : '重新啟用' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 新增 / 編輯視窗 -->
    <div v-if="isModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <h2 class="text-lg font-bold text-gray-900">{{ editingId ? '編輯打卡點' : '新增打卡點' }}</h2>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">代碼</label>
            <input v-model="form.id" :disabled="!!editingId" type="text" placeholder="例如：HQ"
              class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-50 disabled:text-gray-500" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">驗證方式</label>
            <select v-model="form.verifyType" class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
              <option v-for="(label, key) in verifyTypeLabels" :key="key" :value="key">{{ label }} ({{ key }})</option>
            </select>
          </div>
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">名稱</label>
          <input v-model="form.name" type="text" placeholder="例如：總公司辦公室"
            class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
        <div>
          <div class="flex justify-between items-center mb-2">
            <label class="text-sm font-semibold text-gray-700">中心座標</label>
            <button @click="useCurrentLocation" type="button" class="text-xs text-blue-600 hover:underline flex items-center gap-1">
              <span class="material-icons-round text-sm">my_location</span>使用目前位置
            </button>
          </div>
          <div class="grid grid-cols-3 gap-3">
            <input v-model="form.latitude" type="text" inputmode="decimal" placeholder="緯度"
              class="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            <input v-model="form.longitude" type="text" inputmode="decimal" placeholder="經度"
              class="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            <input v-model="form.radiusMeters" type="number" min="1" placeholder="半徑 (公尺)"
              class="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <p class="text-xs text-gray-500 mt-1">緯度、經度、允許打卡半徑 (公尺)。GPS 驗證時使用。</p>
        </div>

        <template v-if="form.verifyType === 'WIFI'">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">WiFi SSID</label>
            <input v-model="form.wifiSsid" type="text"
              class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">BSSID 白名單</label>
            <textarea v-model="form.wifiBssidText" rows="3" placeholder="每行一個，例如 aa:bb:cc:dd:ee:ff"
              class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"></textarea>
          </div>
        </template>

        <div v-if="form.verifyType === 'Bluetooth'">
          <label class="block text-sm font-semibold text-gray-700 mb-2">藍牙 Service UUID</label>
          <input v-model="form.bluetoothServiceUuid" type="text" placeholder="例如 180D 或 xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm" />
          <p class="text-xs text-gray-500 mt-1">App 會掃描廣播此 Service UUID 的藍牙基站，偵測到才允許打卡。</p>
        </div>

        <label class="flex items-center text-sm text-gray-900">
          <input v-model="form.isActive" type="checkbox" class="h-4 w-4 text-blue-600 border-gray-300 rounded mr-2" />
          啟用此打卡點
        </label>

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
