<template>
  <div class="congestion-view">
    <div class="view-header">
      <h2 class="title">🚦 路径拥挤分析</h2>
      <div class="view-controls">
        <button 
          @click="toggleAutoRefresh" 
          class="btn"
          :class="autoRefresh ? 'btn-success' : 'btn-secondary'"
        >
          <span v-if="autoRefresh">⏸️ 停止自动刷新</span>
          <span v-else>▶️ 开始自动刷新</span>
        </button>
      </div>
    </div>
    
    <div class="congestion-summary">
      <div class="summary-card card" :class="getCongestionLevelClass(maxCongestionLevel)">
        <div class="summary-header">
          <h3 class="summary-title">📊 最高拥挤等级</h3>
          <div class="summary-icon">📈</div>
        </div>
        <p class="summary-value">{{ maxCongestionLevel }}</p>
        <div class="summary-status">
          <span :class="getCongestionLevelClass(maxCongestionLevel)">
            {{ getCongestionLevelText(maxCongestionLevel) }}
          </span>
        </div>
      </div>
      
      <div class="summary-card card">
        <div class="summary-header">
          <h3 class="summary-title">🛣️ 拥挤路径数</h3>
          <div class="summary-icon">⚠️</div>
        </div>
        <p class="summary-value">{{ congestedPathsCount }}</p>
        <div class="summary-status">
          <span class="status-warning">超过阈值的路径</span>
        </div>
      </div>
      
      <div class="summary-card card">
        <div class="summary-header">
          <h3 class="summary-title">🚨 预警路径数</h3>
          <div class="summary-icon">🚨</div>
        </div>
        <p class="summary-value">{{ alertPathsCount }}</p>
        <div class="summary-status">
          <span class="status-alert">需要关注的路径</span>
        </div>
      </div>
    </div>
    
    <div class="path-list card">
      <div class="list-header">
        <h3>🛣️ 路径拥挤详情</h3>
        <div class="list-actions">
          <button class="btn btn-small btn-secondary">📄 导出</button>
        </div>
      </div>
      <div class="congestion-list">
        <div 
          v-for="(pathSegment, pathId) in store.pathCongestion" 
          :key="pathId" 
          class="path-item card"
          :class="getCongestionLevelClass(pathSegment.congestionLevel)"
        >
          <div class="path-info">
            <div class="path-name">
              <h4>📍 路径: {{ pathId }}</h4>
              <span class="level-badge" :class="getCongestionLevelClass(pathSegment.congestionLevel)">
                {{ getCongestionLevelText(pathSegment.congestionLevel) }}
              </span>
            </div>
            <div class="path-actions">
              <button class="btn btn-small btn-secondary">🔍 查看详情</button>
            </div>
          </div>
          <div class="path-details">
            <div class="congestion-bar-container">
              <div class="congestion-labels">
                <span>畅通</span>
                <span>拥挤</span>
              </div>
              <div class="level-indicator">
                <div 
                  class="level-bar" 
                  :style="{ width: `${(pathSegment.congestionLevel / 3) * 100}%`, backgroundColor: getCongestionColor(pathSegment.congestionLevel) }"
                ></div>
              </div>
              <div class="congestion-percent">{{ Math.round((pathSegment.congestionLevel / 3) * 100) }}%</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 地图可视化 -->
    <div class="map-visualization card">
      <h3 class="visualization-title">🗺️ 拥挤程度地图可视化</h3>
      <div class="map-wrapper">
        <MapCanvas :canvas-width="800" :canvas-height="600" :show-heatmap="true" />
      </div>
    </div>
    
    <!-- 预警信息 -->
    <div v-if="alertPathsCount > 0" class="alerts card">
      <h3 class="alert-title">🚨 拥挤预警</h3>
      <div class="alert-list">
        <div 
          v-for="(isAlert, pathId) in store.congestionAlerts" 
          :key="pathId" 
          v-show="isAlert"
          class="alert-item"
        >
          <span class="alert-path">📍 路径 {{ pathId }}</span>
          <span class="alert-level status-heavy">严重拥挤</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useTrafficStore } from '@/store/trafficStore';
import MapCanvas from '@/components/MapCanvas.vue';

const store = useTrafficStore();

// 自动刷新状态
const autoRefresh = ref(false);
let refreshInterval: ReturnType<typeof setInterval> | null = null;

// 计算最大拥挤等级
const maxCongestionLevel = computed(() => {
  return Math.max(...Object.values(store.pathCongestion).map(ps => ps.congestionLevel), 0);
});

// 计算拥挤路径数量
const congestedPathsCount = computed(() => {
  return Object.values(store.pathCongestion).filter(ps => ps.congestionLevel > 0).length;
});

// 计算预警路径数量
const alertPathsCount = computed(() => {
  return Object.values(store.congestionAlerts).filter(alert => alert).length;
});

// 获取拥挤等级文本
const getCongestionLevelText = (level: number) => {
  switch(level) {
    case 0: return '畅通';
    case 1: return '轻度拥挤 (1-3辆车)';
    case 2: return '中度拥挤 (4-6辆车)';
    case 3: return '严重拥挤 (7+辆车)';
    default: return '未知';
  }
};

// 获取拥挤等级CSS类
const getCongestionLevelClass = (level: number) => {
  if (level === 0) return 'level-0';
  if (level === 1) return 'level-1';
  if (level === 2) return 'level-2';
  if (level >= 3) return 'level-3';
  return '';
};

// 获取拥挤颜色
const getCongestionColor = (level: number) => {
  switch(level) {
    case 0: return '#4CAF50'; // 绿色
    case 1: return '#FFEB3B'; // 黄色
    case 2: return '#FF9800'; // 橙色
    case 3: return '#F44336'; // 红色
    default: return '#9E9E9E';
  }
};



// 切换自动刷新
const toggleAutoRefresh = () => {
  autoRefresh.value = !autoRefresh.value;
  
  if (autoRefresh.value) {
    // 开启自动刷新
    refreshInterval = setInterval(() => {
      store.fetchVehiclePositions();
    }, 5000); // 每5秒更新一次
  } else {
    // 关闭自动刷新
    if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
  }
};

// 初始化数据
onMounted(async () => {
  await Promise.all([
    store.fetchEntries(),
    store.fetchCheckpoints(),
    store.fetchVehiclePositions()
  ]);
  // calculatePathCongestion和triggerCongestionAlerts现在在fetchVehiclePositions中自动调用
});

// 组件卸载时清理定时器
onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
});
</script>

<style scoped>
.congestion-view {
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
  display: flex;
  gap: 1rem;
}

.view-controls {
  display: flex;
  gap: 1rem;
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

.btn-success {
  background: linear-gradient(135deg, var(--success-color) 0%, #22c55e 100%);
  color: white;
}

.btn-success:hover:not(:disabled) {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
}

.btn-small {
  padding: 0.5rem 0.75rem;
  font-size: 0.85rem;
}

.congestion-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.summary-card {
  padding: 1.5rem;
  border: none;
  transition: var(--transition-normal);
  position: relative;
  overflow: hidden;
  background: white;
}

.summary-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, var(--primary-color), var(--accent-color));
}

.summary-card:hover {
  transform: translateY(-6px);
  box-shadow: var(--shadow-xl);
}

.summary-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.summary-title {
  margin: 0;
  font-size: 0.95rem;
  color: var(--gray-600);
  font-weight: 500;
}

.summary-icon {
  font-size: 1.5rem;
}

.summary-value {
  margin: 0 0 1rem 0;
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--gray-800);
  text-align: center;
}

.summary-status {
  text-align: center;
}

.status-clear {
  background: linear-gradient(135deg, #4ade80, #22c55e);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: var(--radius-full);
  font-size: 0.85rem;
  font-weight: 500;
}

.status-light {
  background: linear-gradient(135deg, #facc15, #eab308);
  color: var(--gray-900);
  padding: 0.25rem 0.75rem;
  border-radius: var(--radius-full);
  font-size: 0.85rem;
  font-weight: 500;
}

.status-medium {
  background: linear-gradient(135deg, #f97316, #ea580c);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: var(--radius-full);
  font-size: 0.85rem;
  font-weight: 500;
}

.status-heavy {
  background: linear-gradient(135deg, #f87171, #ef4444);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: var(--radius-full);
  font-size: 0.85rem;
  font-weight: 500;
}

.status-warning {
  color: var(--warning-color);
  font-weight: 500;
}

.status-alert {
  color: var(--danger-color);
  font-weight: 500;
}

.details {
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 30px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.path-list {
  padding: 1.5rem;
  border: none;
  background: white;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--gray-200);
}

.list-header h3 {
  margin: 0;
  color: var(--gray-800);
  font-size: 1.2rem;
  font-weight: 600;
}

.list-actions {
  display: flex;
  gap: 0.5rem;
}

.congestion-list {
  max-height: 400px;
  overflow-y: auto;
}

.path-item {
  margin-bottom: 1rem;
  padding: 1.25rem;
  border: none;
  transition: var(--transition-normal);
}

.path-item:hover {
  transform: translateX(4px);
  box-shadow: var(--shadow-md);
}

.congestion-item {
  padding: 15px;
  border-radius: 6px;
  margin-bottom: 10px;
  border-left: 4px solid #ddd;
}

.congestion-item .path-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.path-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.path-name {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.path-name h4 {
  margin: 0;
  color: var(--gray-800);
  font-size: 1.1rem;
  font-weight: 600;
}

.level-badge {
  background: #e0e0e0;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.8em;
}

.level-badge.status-clear,
.level-badge.status-light,
.level-badge.status-medium,
.level-badge.status-heavy {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: var(--radius-full);
  font-size: 0.85rem;
  font-weight: 500;
}

.level-description {
  font-size: 0.9em;
  color: #666;
  margin-bottom: 8px;
}

.path-actions {
  display: flex;
  gap: 0.5rem;
}

.path-details {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.congestion-bar-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.congestion-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: var(--gray-600);
}

.level-indicator {
  height: 24px;
  background-color: var(--gray-200);
  border-radius: 12px;
  overflow: hidden;
  position: relative;
}

.level-bar {
  height: 100%;
  transition: width 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 8px;
  color: white;
  font-size: 0.75rem;
  font-weight: 500;
}

.congestion-percent {
  text-align: right;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--gray-700);
}

.map-visualization {
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 30px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.visualization-title {
  margin: 0 0 1rem 0;
  color: var(--gray-800);
  font-size: 1.2rem;
  font-weight: 600;
}

.map-wrapper {
  position: relative;
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
  margin-top: 15px;
}

.heatmap-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none; /* 使热力图不影响底层元素的交互 */
}

.alerts {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.alert-title {
  margin: 0 0 1rem 0;
  color: var(--gray-800);
  font-size: 1.2rem;
  font-weight: 600;
}

.alert-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.alert-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background-color: #ffebee;
  border-radius: 4px;
  border-left: 4px solid #f44336;
}

.alert-level {
  background-color: #f44336;
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.8em;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .view-header {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }
  
  .congestion-summary {
    grid-template-columns: 1fr;
  }
  
  .path-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .list-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .list-actions {
    align-self: stretch;
  }
  
  .btn {
    flex: 1;
  }
}
</style>