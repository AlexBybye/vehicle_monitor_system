<template>
  <div class="history-view">
    <div class="view-header">
      <h2 class="title">📋 历史记录查询</h2>
      <SearchBar @search="handleSearch" />
    </div>
    
    <div class="controls card">
      <div class="date-range">
        <div class="input-group">
          <label class="input-label">📅 起始日期:</label>
          <input type="date" v-model="startDate" class="input-field">
        </div>
        <div class="input-group">
          <label class="input-label">🔚 结束日期:</label>
          <input type="date" v-model="endDate" class="input-field">
        </div>
        <button @click="filterByDate" class="btn btn-primary shake-on-hover">
          📅 按日期筛选
        </button>
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
    
    <div class="vehicle-selector card">
      <div class="selector-content">
        <label class="input-label">🚗 选择车辆:</label>
        <select v-model="selectedVehicleNo" @change="loadVehicleHistory" class="input-field">
          <option value="">请选择车辆</option>
          <option v-for="vehicle in store.vehicles" :key="vehicle.No" :value="vehicle.No">
            {{ vehicle.No }} ({{ vehicle.Position.Pos_X }}, {{ vehicle.Position.Pos_Y }})
          </option>
        </select>
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
import { ref, computed, watch } from 'vue';
import { useTrafficStore } from '@/store/trafficStore';
import SearchBar from '@/components/SearchBar.vue';
import { formatDate } from '@/utils';
import type { VehicleHistory } from '@/types';

const store = useTrafficStore();

// 控制状态
const startDate = ref('');
const endDate = ref('');
const selectedVehicleNo = ref('');
const currentPage = ref(1);
const pageSize = ref(10);
const hoveredVehicle = ref<VehicleHistory | null>(null);

// 搜索处理
const handleSearch = (query: string) => {
  // 搜索功能将在SearchBar组件中处理
};

// 按日期筛选
const filterByDate = async () => {
  // 注意：目前 store 中没有 fetchHistoryByDateRange 方法，这里暂时不做任何操作
  // 在实际实现时，需要在 store 中添加相应的方法
  console.warn('fetchHistoryByDateRange 方法尚未在 store 中实现');
};

// 加载车辆历史
const loadVehicleHistory = async () => {
  if (selectedVehicleNo.value) {
    await store.fetchVehiclesHistory(selectedVehicleNo.value, 1);
    currentPage.value = 1; // 重置到第一页
  }
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
      utils.exportToCSV(store.historyRecords, `${selectedVehicleNo.value}_history.csv`);
    });
  }
};

// 导出JSON
const handleExportToJSON = () => {
  if (store.historyRecords.length > 0) {
    import('@/utils').then(utils => {
      utils.exportToJSON(store.historyRecords, `${selectedVehicleNo.value}_history.json`);
    });
  }
};
</script>

<style scoped>
.history-view {
  padding: 1rem;
  min-height: 100vh;
  background: linear-gradient(135deg, var(--gray-50) 0%, var(--gray-100) 100%);
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

.date-range {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.input-group {
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