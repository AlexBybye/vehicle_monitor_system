<template>
  <div class="history-view">
    <div class="view-header">
      <h2 class="title">📋 历史记录查询</h2>
      <SearchBar @search="handleSearch" />
    </div>
    
    <div class="controls card">
      <div class="query-options">
        <div class="vehicle-selector">
          <label class="input-label">🚗 方式一:选择现运行车辆:</label>
          <select v-model="selectedVehicleNo" @change="loadVehicleHistory" class="input-field">
            <option value="">请选择车辆</option>
            <option v-for="vehicle in store.vehicles" :key="vehicle.No" :value="vehicle.No">
              {{ vehicle.No }} ({{ vehicle.Position.Pos_X }}, {{ vehicle.Position.Pos_Y }})
            </option>
          </select>
        </div>
        
        <div class="manual-search">
          <label class="input-label">🔍 方式二:手动输入车牌号:</label>
          <div class="search-input-wrapper">
            <input 
              v-model="manualVehicleNo" 
              type="text" 
              placeholder="请输入车牌号" 
              class="input-field"
              @keyup.enter="handleManualSearch"
            />
            <button @click="handleManualSearch" class="btn btn-primary">
              搜索
            </button>
          </div>
        </div>
      </div>
      
      <div class="date-range-controls">
        <div class="date-time-range">
          <div class="datetime-group">
            <label class="input-label">📅 起始时间:</label>
            <div class="datetime-inputs">
              <input type="date" v-model="startDate" class="input-field" @change="validateDateRange">
              <input type="time" v-model="startTime" class="input-field" @change="validateDateRange">
              <span v-if="dateRangeError" class="error-message">{{ dateRangeError }}</span>
            </div>
          </div>
          <div class="datetime-group">
            <label class="input-label">🔚 结束时间:</label>
            <div class="datetime-inputs">
              <input type="date" v-model="endDate" class="input-field" @change="validateDateRange">
              <input type="time" v-model="endTime" class="input-field" @change="validateDateRange">
            </div>
          </div>
          <div class="datetime-actions">
            <button @click="filterByDate" class="btn btn-primary datetime-filter-btn" :disabled="!!dateRangeError">
              📅 按时间筛选
            </button>
            <button @click="clearDateFilter" class="btn btn-secondary datetime-clear-btn">
              🗑️ 清空筛选
            </button>
          </div>
        </div>
        
        <div class="actions">
          <button @click="handleExportToCSV" class="btn btn-success btn-full-width">
            📥 导出CSV
          </button>
          <button @click="handleExportToJSON" class="btn btn-info btn-full-width">
            📄 导出JSON
          </button>
        </div>
      </div>
    </div>
    
    <div class="results card">
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-number">{{ store.historyRecords.length }}</div>
          <div class="stat-label">📊 总计记录</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{{ averageSpeed.toFixed(2) }}</div>
          <div class="stat-label">🏎️ 平均速度 (km/h)</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{{ maxSpeed }}</div>
          <div class="stat-label">⚡ 最高速度 (km/h)</div>
        </div>
      </div>
      
      <div class="history-list">
        <div 
          v-for="(record, index) in paginatedRecords" 
          :key="index" 
          class="history-item card"
          :class="{ 'highlight': hoveredVehicle && hoveredVehicle.VehicleNo === record.VehicleNo && hoveredVehicle.EnterTime === record.EnterTime }"
          @mouseenter="hoveredVehicle = record"
          @mouseleave="hoveredVehicle = null"
        >
          <div class="record-header">
            <div class="vehicle-info">
              <span class="vehicle-no">🏷️ {{ record.VehicleNo }}</span>
              <span class="timestamp">⏱️ {{ formatDate(record.EnterTime) }}</span>
            </div>
            <div class="record-stats">
              <span class="speed-badge">💨 {{ record.Speed ?? 0 }} km/h</span>
              <button @click.stop="showVehiclePath(record)" class="btn btn-path" title="显示车辆轨迹">
                📍 轨迹
              </button>
              <button @click.stop="showVehicleDetails(record)" class="btn btn-details" title="查看详情">
                📋 详情
              </button>
            </div>
          </div>
          <div class="record-details">
            <div class="detail-row">
              <span class="detail-label">🚪 入口:</span>
              <span class="detail-value">{{ record.EnterName }}</span>
            </div>
            <div class="detail-row" v-if="record.ExitName">
              <span class="detail-label">🚪 出口:</span>
              <span class="detail-value">{{ record.ExitName }}</span>
            </div>
            <div class="detail-row" v-if="record.Charge !== undefined">
              <span class="detail-label">💰 费用:</span>
              <span class="detail-value">¥{{ record.Charge }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="pagination">
        <button 
          @click="prevPage" 
          :disabled="currentPage === 1" 
          class="btn btn-secondary"
        >
          ⬅️ 上一页
        </button>
        <span class="page-info">
          第 {{ currentPage }} 页，共 {{ totalPages }} 页 ({{ store.historyRecords.length }} 条记录)
        </span>
        <button 
          @click="nextPage" 
          :disabled="currentPage === totalPages" 
          class="btn btn-secondary"
        >
          下一页 ➡️
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useTrafficStore } from '@/store/trafficStore';
import SearchBar from '@/components/SearchBar.vue';
import { formatDate } from '@/utils';
import type { VehicleHistory } from '@/types';

const store = useTrafficStore();

// 控制状态
const startDate = ref('');
const endDate = ref('');
const startTime = ref('00:00');
const endTime = ref('23:59');
const selectedVehicleNo = ref('');
const manualVehicleNo = ref('');
const currentPage = ref(1);
const pageSize = ref(10);
const hoveredVehicle = ref<VehicleHistory | null>(null);

// 存储原始历史记录
const originalHistoryRecords = ref<VehicleHistory[]>([]);

// 初始化：未选择车辆时，加载所有车辆的历史，提供"总计/平均/最高"基准数据
onMounted(async () => {
  // 确保基础数据可用
  if (store.entries.length === 0) await store.fetchEntries();
  if (store.checkpoints.length === 0) await store.fetchCheckpoints();
  if (store.vehicles.length === 0) await store.fetchVehiclePositions();
  // 默认加载全部车辆的历史，作为"未选择车辆"时的列表与统计数据源
  await store.fetchAllVehiclesHistory();
  originalHistoryRecords.value = [...store.historyRecords];
});

// 搜索处理（保留原有功能）
const handleSearch = async (query: string) => {
  if (query.trim()) {
    await store.fetchVehiclesHistory(query.trim(), 1);
    selectedVehicleNo.value = query.trim(); // 同步选择的车辆
    // 切换数据集后，重置时间筛选基线，避免上次筛选的"原始记录"错位
    originalHistoryRecords.value = [...store.historyRecords];
    currentPage.value = 1;
  }
};

// 手动输入车牌号搜索
const handleManualSearch = async () => {
  if (manualVehicleNo.value.trim()) {
    await store.fetchVehiclesHistory(manualVehicleNo.value.trim(), 1);
    selectedVehicleNo.value = manualVehicleNo.value.trim();
    originalHistoryRecords.value = [...store.historyRecords];
    currentPage.value = 1;
  }
};

// 验证日期范围
const dateRangeError = ref('');

const validateDateRange = () => {
  if (startDate.value && endDate.value) {
    // 组合日期和时间
    const startDateTime = new Date(`${startDate.value}T${startTime.value}`);
    const endDateTime = new Date(`${endDate.value}T${endTime.value}`);
    
    if (startDateTime > endDateTime) {
      dateRangeError.value = '起始时间不能晚于结束时间！';
      return false;
    }
  }
  dateRangeError.value = '';
  return true;
};

// 存储原始历史记录（已在文件顶部声明）

// 按日期筛选
const filterByDate = async () => {
  if (!validateDateRange()) {
    return;
  }
  
  if (startDate.value && endDate.value) {
    // 组合日期和时间
    const startDateTime = `${startDate.value}T${startTime.value}`;
    const endDateTime = `${endDate.value}T${endTime.value}`;
    
    // 如果还没有保存原始记录，则保存一份
    if (originalHistoryRecords.value.length === 0) {
      originalHistoryRecords.value = [...store.historyRecords];
    }
    
    // 从原始记录中筛选 - 直接使用原始时间戳进行比较
    const start = new Date(startDateTime);
    const end = new Date(endDateTime);
    
    const filteredRecords = originalHistoryRecords.value.filter(record => {
      // 直接解析原始时间戳格式 /Date(1756871452790+0800)/
      const timeMatch = record.EnterTime?.match(/\/Date\((\d+)\+\d+\)\//);
      if (timeMatch && timeMatch[1]) {
        const timestamp = parseInt(timeMatch[1], 10);
        const recordDate = new Date(timestamp);
        
        // 调试输出
        console.log('Record time:', recordDate, 'Start:', start, 'End:', end, 'Match:', recordDate >= start && recordDate <= end);
        
        return recordDate >= start && recordDate <= end;
      }
      return false; // 如果无法解析时间，则排除该记录
    });
    
    // 更新显示的记录
    store.historyRecords = filteredRecords;
    currentPage.value = 1; // 重置到第一页
    
    console.log('Filtered records:', filteredRecords);
  }
};

// 清空日期筛选
const clearDateFilter = () => {
  startDate.value = '';
  endDate.value = '';
  startTime.value = '00:00';
  endTime.value = '23:59';
  dateRangeError.value = '';
  
  // 恢复原始记录（如果存在）
  if (originalHistoryRecords.value.length > 0) {
    store.historyRecords = [...originalHistoryRecords.value];
    originalHistoryRecords.value = []; // 清空原始记录
  }
  currentPage.value = 1; // 重置到第一页
};

// 加载车辆历史；如果用户选择的是"请选择车辆"（空值），则加载全部车辆历史
const loadVehicleHistory = async () => {
  if (selectedVehicleNo.value) {
    await store.fetchVehiclesHistory(selectedVehicleNo.value, 1);
  } else {
    await store.fetchAllVehiclesHistory();
  }
  // 切换数据集，重置时间筛选基线
  originalHistoryRecords.value = [...store.historyRecords];
  currentPage.value = 1;
};

// 计算分页数据
const paginatedRecords = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return store.historyRecords.slice(start, end);
});

const totalPages = computed(() => {
  return Math.ceil(store.historyRecords.length / pageSize.value);
});

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
  }
};

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
  }
};

// 计算统计数据
const averageSpeed = computed(() => {
  if (store.historyRecords.length === 0) return 0;
  const validSpeeds = store.historyRecords
    .map(record => record.Speed)
    .filter(speed => speed !== undefined) as number[];
  if (validSpeeds.length === 0) return 0;
  const total = validSpeeds.reduce((sum, speed) => sum + speed, 0);
  return total / validSpeeds.length;
});

const maxSpeed = computed(() => {
  if (store.historyRecords.length === 0) return 0;
  const validSpeeds = store.historyRecords
    .map(record => record.Speed)
    .filter(speed => speed !== undefined) as number[];
  if (validSpeeds.length === 0) return 0;
  return Math.max(...validSpeeds, 0);
});

// 导出CSV
const handleExportToCSV = () => {
  if (store.historyRecords.length > 0) {
    import('@/utils').then(utils => {
      utils.exportToCSV(store.historyRecords, `${selectedVehicleNo.value || 'all'}_history.csv`);
    });
  } else {
    alert('未查询到任何数据，无法导出！');
  }
};

// 导出JSON
const handleExportToJSON = () => {
  if (store.historyRecords.length > 0) {
    import('@/utils').then(utils => {
      utils.exportToJSON(store.historyRecords, `${selectedVehicleNo.value || 'all'}_history.json`);
    });
  } else {
    alert('未查询到任何数据，无法导出！');
  }
};

// 存储当前选中的车辆路径
const selectedVehiclePath = ref<any[]>([]);

// 显示车辆路径
const showVehiclePath = async (record: VehicleHistory) => {
  console.log('显示车辆路径:', record);
  // 关键：传入具体记录，避免永远使用首条历史的轨迹
  const pathData = await store.getVehiclePathForPlayback(record.VehicleNo, record);
  console.log('车辆轨迹数据:', pathData);

  selectedVehiclePath.value = pathData;
  store.setVehiclePathToDisplay(pathData);

  if (pathData.length > 0) {
    console.log(`车辆 ${record.VehicleNo} 的路径已发送到地图组件显示`);
    alert(`已准备显示车辆 ${record.VehicleNo} 的路径\n入口: ${record.EnterName} → 出口: ${record.ExitName || '未离开'}\n轨迹点数量: ${pathData.length}\n请切换到地图视图查看路径`);
  } else {
    alert(`未能获取车辆 ${record.VehicleNo} 的轨迹数据。`);
  }
};

// 显示车辆详细信息
const showVehicleDetails = async (record: VehicleHistory) => {
  console.log('显示车辆详情:', record);
  // 获取车辆详细信息：传入点击的具体记录，避免永远显示首条
  const detail = await store.fetchVehicleDetail(record.VehicleNo, record);

  if (detail) {
    let detailMessage = `车辆详细信息:\n`;
    detailMessage += `车牌号: ${detail.No}\n`;
    detailMessage += `入口: ${detail.EnterName} (${detail.EnterNo})\n`;
    detailMessage += `进入时间: ${formatDate(detail.EnterTime)}\n`;
    if (record.ExitName) {
      detailMessage += `出口: ${record.ExitName}${record.ExitNo ? ` (${record.ExitNo})` : ''}\n`;
    }
    if (record.ExitTime) {
      detailMessage += `离开时间: ${formatDate(record.ExitTime)}\n`;
    }
    detailMessage += `速度: ${detail.Speed} km/h\n`;
    detailMessage += `入口位置: (${detail.Position.Pos_X}, ${detail.Position.Pos_Y})\n`;
    if (record.Charge !== undefined) {
      detailMessage += `费用: ¥${record.Charge}\n`;
    }

    alert(detailMessage);
  } else {
    alert(`未能获取车辆 ${record.VehicleNo} 的详细信息。`);
  }
};
</script>

<style scoped>
.history-view {
  padding: 1rem;
  min-height: 100vh;
  background: linear-gradient(135deg, var(--gray-50) 0%, var(--gray-100) 100%);
}

:root {
  --primary-color: #4361ee;
  --secondary-color: #3a0ca3;
  --success-color: #4cc9f0;
  --warning-color: #f72585;
  --info-color: #4895ef;
  --danger-color: #e63946;
  --gray-50: #f9fafb;
  --gray-100: #f3f4f6;
  --gray-200: #e5e7eb;
  --gray-300: #d1d5db;
  --gray-500: #6b7280;
  --gray-600: #4b5563;
  --gray-700: #374151;
  --gray-800: #1f2937;
  --gray-900: #111827;
  --radius: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-full: 9999px;
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --transition-normal: all 0.3s ease;
}

.error-message {
  color: #e74c3c;
  font-size: 0.8rem;
  margin-top: 0.25rem;
  display: block;
}

.controls-row {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.vehicle-selector {
  flex: 1;
  min-width: 250px;
}

.search-section {
  flex: 1;
  min-width: 300px;
  display: flex;
  align-items: flex-end;
}

.date-range-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  align-items: flex-start;
}

.date-range {
  flex: 1;
  min-width: 300px;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 150px;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: white;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}

.title {
  margin: 0;
  font-size: 1.5rem;
  color: var(--gray-800);
  font-weight: 600;
}

.controls {
  margin-bottom: 1.5rem;
  padding: 1.5rem;
  background: white;
  border: none;
}

.query-options {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.vehicle-selector, .manual-search {
  flex: 1;
  min-width: 300px;
}

.manual-search .search-input-wrapper {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.manual-search input[type="text"] {
  flex: 1;
}

.date-range-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  align-items: flex-start;
}

.date-time-range {
  flex: 2;
  min-width: 400px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.datetime-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.datetime-inputs {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.datetime-inputs input {
  min-width: 140px;
}

.datetime-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.datetime-filter-btn {
  min-width: 120px;
}

.datetime-clear-btn {
  min-width: 100px;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 150px;
}

.input-label {
  font-weight: 500;
  color: var(--gray-700);
  font-size: 0.9rem;
}

.input-field {
  padding: 0.75rem;
  border: 2px solid var(--gray-200);
  border-radius: var(--radius);
  font-size: 0.95rem;
  transition: var(--transition-normal);
}

.input-field:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(67, 97, 238, 0.1);
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 200px;
}

.vehicle-selector {
  margin-bottom: 1.5rem;
  padding: 1.5rem;
  background: white;
  border: none;
}

.selector-content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.results {
  padding: 1.5rem;
  background: white;
  border: none;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat-card {
  background: linear-gradient(135deg, var(--gray-50) 0%, var(--gray-100) 100%);
  padding: 1.5rem;
  border-radius: var(--radius-lg);
  text-align: center;
  transition: var(--transition-normal);
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.stat-number {
  font-size: 2rem;
  font-weight: 700;
  color: var(--primary-color);
  margin-bottom: 0.25rem;
}

.stat-label {
  font-size: 0.9rem;
  color: var(--gray-600);
  font-weight: 500;
}

.history-list {
  max-height: 500px;
  overflow-y: auto;
  margin-bottom: 1.5rem;
  border-radius: var(--radius);
  border: 1px solid var(--gray-200);
}

.history-item {
  margin: 0.75rem;
  padding: 1rem;
  border: none;
  transition: var(--transition-normal);
}

.history-item.highlight {
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
  border-left: 4px solid var(--primary-color);
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px dashed var(--gray-200);
}

.vehicle-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.vehicle-no {
  font-weight: 600;
  color: var(--gray-800);
  font-size: 1.1rem;
}

.timestamp {
  color: var(--gray-500);
  font-size: 0.85rem;
}

.record-stats {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.speed-badge {
  background: linear-gradient(135deg, var(--success-color) 0%, #22c55e 100%);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: var(--radius-full);
  font-size: 0.85rem;
  font-weight: 500;
}

.btn-path {
  background: linear-gradient(135deg, var(--warning-color) 0%, #f59e0b 100%);
  color: white;
  border: none;
  padding: 0.25rem 0.75rem;
  border-radius: var(--radius);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition-normal);
}

.btn-path:hover:not(:disabled) {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.btn-details {
  background: linear-gradient(135deg, var(--info-color) 0%, #3b82f6 100%);
  color: white;
  border: none;
  padding: 0.25rem 0.75rem;
  border-radius: var(--radius);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition-normal);
}

.btn-details:hover:not(:disabled) {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.record-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.25rem 0;
}

.detail-label {
  font-weight: 500;
  color: var(--gray-600);
  flex-shrink: 0;
  width: 80px;
}

.detail-value {
  color: var(--gray-800);
  text-align: right;
  flex: 1;
  margin-left: 1rem;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.btn {
  padding: 0.75rem 1rem;
  border: none;
  border-radius: var(--radius);
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 500;
  transition: var(--transition-normal);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.btn:active:not(:disabled) {
  transform: translateY(0);
}

.btn-primary {
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #3a56e4 0%, #362fc0 100%);
}

.btn-success {
  background: linear-gradient(135deg, var(--success-color) 0%, #22c55e 100%);
  color: white;
}

.btn-success:hover:not(:disabled) {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
}

.btn-info {
  background: linear-gradient(135deg, var(--info-color) 0%, #38bdf8 100%);
  color: var(--gray-900);
}

.btn-info:hover:not(:disabled) {
  background: linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%);
}

.btn-secondary {
  background: var(--gray-200);
  color: var(--gray-800);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--gray-300);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
}

.btn-full-width {
  width: 100%;
  justify-content: flex-start;
  padding: 0.75rem 1rem;
}

.btn-full-width:hover:not(:disabled) {
  background-color: var(--gray-50);
  padding-left: 1.25rem;
}

.page-info {
  color: var(--gray-600);
  font-weight: 500;
  text-align: center;
  flex: 1;
  min-width: 200px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .date-range {
    flex-direction: column;
    align-items: stretch;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .pagination {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .page-info {
    min-width: auto;
  }
}
</style>