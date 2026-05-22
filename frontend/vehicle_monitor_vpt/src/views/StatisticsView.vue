<template>
  <div class="statistics-view">
    <div class="view-header">
      <h2 class="title">📊 统计分析</h2>
      <div class="date-range card">
        <div class="date-input-group">
          <label class="input-label">📅 开始日期:</label>
          <input type="date" v-model="startDate" class="input-field">
        </div>
        <div class="date-input-group">
          <label class="input-label">🔚 结束日期:</label>
          <input type="date" v-model="endDate" class="input-field">
        </div>
        <button 
          @click="fetchStatistics" 
          class="btn btn-primary shake-on-hover"
        >
          🔍 查询
        </button>
      </div>
    </div>
    
    <div class="stats-overview">
      <div class="stat-card card">
        <div class="stat-header">
          <h3 class="stat-title">🚗 总通行车辆</h3>
          <div class="stat-icon">📈</div>
        </div>
        <p class="stat-number">{{ statistics.totalVehicles }}</p>
        <div class="stat-trend">
          <span class="trend-up">↗️ +12%</span>
          <span>较上周</span>
        </div>
      </div>
      <div class="stat-card card">
        <div class="stat-header">
          <h3 class="stat-title">⏱️ 平均停留时间</h3>
          <div class="stat-icon">⏱️</div>
        </div>
        <p class="stat-number">{{ statistics.avgStayDuration }} <small>分钟</small></p>
        <div class="stat-trend">
          <span class="trend-down">↘️ -5%</span>
          <span>较上周</span>
        </div>
      </div>
      <div class="stat-card card">
        <div class="stat-header">
          <h3 class="stat-title">🏎️ 平均车速</h3>
          <div class="stat-icon">🏎️</div>
        </div>
        <p class="stat-number">{{ statistics.avgSpeed }} <small>km/h</small></p>
        <div class="stat-trend">
          <span class="trend-up">↗️ +8%</span>
          <span>较上周</span>
        </div>
      </div>
      <div class="stat-card card">
        <div class="stat-header">
          <h3 class="stat-title">🚦 拥堵发生次数</h3>
          <div class="stat-icon">🚦</div>
        </div>
        <p class="stat-number">{{ statistics.congestionCount }}</p>
        <div class="stat-trend">
          <span class="trend-down">↘️ -15%</span>
          <span>较上周</span>
        </div>
      </div>
    </div>
    
    <div class="chart-section card">
      <div class="chart-header">
        <h3>🚪 各入口流量统计</h3>
        <div class="chart-actions">
          <button class="btn btn-secondary">📄 导出</button>
        </div>
      </div>
      <ChartPanel :data="entryFlowData" chart-type="bar" title="入口流量统计" />
    </div>
    
    <div class="chart-section card">
      <div class="chart-header">
        <h3>🕐 各时段流量分布</h3>
        <div class="chart-actions">
          <button class="btn btn-secondary">📄 导出</button>
        </div>
      </div>
      <ChartPanel :data="hourlyFlowData" chart-type="line" title="时段流量分布" />
    </div>
    
    <div class="chart-section card">
      <div class="chart-header">
        <h3>🚙 车辆类型分布</h3>
        <div class="chart-actions">
          <button class="btn btn-secondary">📄 导出</button>
        </div>
      </div>
      <ChartPanel :data="vehicleTypeData" chart-type="pie" title="车辆类型分布" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useTrafficStore } from '@/store/trafficStore';
import ChartPanel from '@/components/ChartPanel.vue';
import type { StatisticsByEntry } from '@/types';

const store = useTrafficStore();

// 日期范围
const startDate = ref('');
const endDate = ref('');

// 获取默认日期范围（最近7天）
const getDefaultDateRange = () => {
  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  startDate.value = weekAgo.toISOString().split('T')[0] ?? '';
  endDate.value = today.toISOString().split('T')[0] ?? '';
};

// 初始化默认日期范围
getDefaultDateRange();

// 获取统计数据
const fetchStatistics = async () => {
  // 注意：目前 store 中没有 fetchStatisticsByDateRange 方法，这里暂时不做任何操作
  // 在实际实现时，需要在 store 中添加相应的方法
  console.warn('fetchStatisticsByDateRange 方法尚未在 store 中实现');
};

// 初始化数据
onMounted(async () => {
  await fetchStatistics();
});

// 计算入口流量数据
const entryFlowData = computed(() => {
  const entries = store.entries;
  // 这里使用模拟数据，因为实际的统计数据结构可能不同
  return entries.map(entry => ({
    label: entry.Name,
    value: Math.floor(Math.random() * 100) // 模拟数据
  }));
});

// 计算时段流量数据
const hourlyFlowData = computed(() => {
  // 模拟时段数据
  return Array.from({ length: 24 }, (_, i) => ({
    label: `${i}时`,
    value: Math.floor(Math.random() * 50)
  }));
});

// 计算车辆类型数据
const vehicleTypeData = computed(() => {
  // 模拟车辆类型数据
  return [
    { label: '小型车', value: Math.floor(Math.random() * 100) },
    { label: '大型车', value: Math.floor(Math.random() * 50) },
    { label: '货车', value: Math.floor(Math.random() * 30) }
  ];
});

// 获取统计摘要
const statistics = computed(() => {
  // 返回模拟的统计摘要
  return {
    totalVehicles: store.vehicles.length,
    avgStayDuration: Math.floor(Math.random() * 60),
    avgSpeed: Math.floor(Math.random() * 100) + 30,
    congestionCount: Math.floor(Math.random() * 10)
  };
});
</script>

<style scoped>
.statistics-view {
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

.date-range {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--gray-50);
  border: none;
}

.date-input-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 140px;
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

.btn-secondary {
  background: var(--gray-200);
  color: var(--gray-800);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--gray-300);
}

.stats-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.stat-card {
  padding: 1.5rem;
  border: none;
  transition: var(--transition-normal);
  position: relative;
  overflow: hidden;
  background: white;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, var(--primary-color), var(--accent-color));
}

.stat-card:hover {
  transform: translateY(-6px);
  box-shadow: var(--shadow-xl);
}

.stat-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.stat-title {
  margin: 0;
  font-size: 0.95rem;
  color: var(--gray-600);
  font-weight: 500;
}

.stat-icon {
  font-size: 1.5rem;
}

.stat-number {
  margin: 0 0 1rem 0;
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--gray-800);
  text-align: center;
}

.stat-number small {
  font-size: 1rem;
  font-weight: normal;
  color: var(--gray-600);
}

.stat-trend {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--gray-600);
}

.trend-up {
  color: var(--success-color);
}

.trend-down {
  color: var(--danger-color);
}

.chart-section {
  margin-bottom: 1.5rem;
  padding: 1.5rem;
  border: none;
  background: white;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--gray-200);
}

.chart-header h3 {
  margin: 0;
  color: var(--gray-800);
  font-size: 1.2rem;
  font-weight: 600;
}

.chart-actions {
  display: flex;
  gap: 0.5rem;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .date-range {
    flex-direction: column;
    align-items: stretch;
  }
  
  .stats-overview {
    grid-template-columns: 1fr;
  }
  
  .chart-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .chart-actions {
    align-self: stretch;
  }
  
  .btn {
    flex: 1;
  }
}
</style>