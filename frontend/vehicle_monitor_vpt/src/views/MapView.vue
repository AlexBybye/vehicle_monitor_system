<template>
  <div class="map-view">
    <div class="view-header">
      <h2 class="title">📍 车辆实时监控</h2>
      <div class="status-bar">
        <div class="status-item">
          <span class="status-label">📊 实时车辆:</span>
          <span class="status-value">{{ activeVehiclesCount }}</span>
        </div>
        <div class="status-item">
          <span class="status-label">⏰ 最后更新:</span>
          <span class="status-value">{{ lastUpdateTime }}</span>
        </div>
      </div>
    </div>
    
    <div class="map-content">
      <!-- 地图画布 -->
      <div class="map-wrapper card">
        <div class="map-header">
          <h3>🗺️ 实时交通地图</h3>
          <div class="map-actions">
            <button 
              @click="debouncedToggleHeatmap" 
              class="btn btn-secondary"
              :class="{ 'active': showHeatmap }"
            >
              {{ showHeatmap ? '✅ 热力图已开启' : '🗺️ 显示热力图' }}
            </button>
          </div>
        </div>
        <div class="canvas-container">
          <MapCanvas :canvas-width="800" :canvas-height="600" :show-heatmap="showHeatmap" />
        </div>
      </div>
      
      <!-- 控制面板 -->
      <div class="control-panel card">
        <div class="panel-section">
          <h3 class="section-title">⚙️ 控制选项</h3>
          <div class="control-group">
            <div class="control-item">
              <label class="checkbox-label">
                <input 
                  type="checkbox" 
                  v-model="showHeatmap" 
                  class="checkbox-input"
                />
                <span class="checkbox-custom"></span>
                <span class="checkbox-text">显示拥挤热力图</span>
              </label>
            </div>
          </div>
          

        </div>
        

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useTrafficStore } from '@/store/trafficStore';
import MapCanvas from '@/components/MapCanvas.vue';
import { formatDate } from '@/utils';

const store = useTrafficStore();

// 控制状态
const showHeatmap = ref(false);
const lastUpdateTime = ref('');

// 计算活跃车辆数量
const activeVehiclesCount = computed(() => {
  return store.vehicles.filter(v => !(v.Position.Pos_X === 0 && v.Position.Pos_Y === 0)).length;
});

// 防抖函数
const debounce = (func: () => void, delay: number) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return () => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(func, delay);
  };
};

// 计算拥挤度并切换热力图显示
const toggleHeatmapWithCalculation = async () => {
  // 切换显示状态
  showHeatmap.value = !showHeatmap.value;
  
  // 只有在开启热力图时才计算拥挤度
  if (showHeatmap.value) {
    // 确保数据是最新的，然后再计算拥挤度
    await store.fetchVehiclePositions();
    store.calculatePathCongestion();
    store.triggerCongestionAlerts();
  }
};

// 使用防抖包装函数，防止快速点击
const debouncedToggleHeatmap = debounce(toggleHeatmapWithCalculation, 300);

// 定时更新数据
let refreshInterval: ReturnType<typeof setInterval> | null = null;

onMounted(async () => {
  // 初始化数据
    await Promise.all([
      store.fetchEntries(),
      store.fetchCheckpoints(),
      store.fetchVehiclePositions()
    ]);
    
    // 更新最后更新时间
    lastUpdateTime.value = new Date().toLocaleTimeString('zh-CN');
  
  // 设置定时器每1秒更新一次数据
  refreshInterval = setInterval(async () => {
      await store.fetchVehiclePositions();
      // 更新最后更新时间
      lastUpdateTime.value = new Date().toLocaleTimeString('zh-CN');
    }, 1000);
});

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
});


</script>

<style scoped>
.map-view {
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

.status-bar {
  display: flex;
  gap: 1.5rem;
  font-size: 0.9rem;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-label {
  font-weight: 500;
  color: var(--gray-600);
}

.status-value {
  font-weight: 600;
  color: var(--primary-color);
  background: var(--gray-100);
  padding: 0.25rem 0.75rem;
  border-radius: var(--radius-full);
}

.map-content {
  display: grid;
  grid-template-columns: 1fr 350px;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.map-wrapper {
  overflow: hidden;
  border: none;
}

.map-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: var(--gray-50);
  border-bottom: 1px solid var(--gray-200);
}

.map-header h3 {
  margin: 0;
  color: var(--gray-800);
  font-size: 1.2rem;
}

.map-actions {
  display: flex;
  gap: 0.5rem;
}

.canvas-container {
  position: relative;
  width: 100%;
  height: 600px;
}

.heatmap-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none; /* 使热力图不影响底层元素的交互 */
}

.control-panel {
  overflow: hidden;
  border: none;
}

.panel-section {
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: var(--gray-50);
  border-radius: var(--radius);
}

.section-title {
  margin: 0 0 1rem 0;
  color: var(--gray-800);
  font-size: 1.1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.control-group {
  margin-bottom: 1rem;
}

.control-item {
  margin-bottom: 1rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
  padding: 0.5rem;
  border-radius: var(--radius);
  transition: var(--transition-normal);
}

.checkbox-label:hover {
  background: var(--gray-100);
  transform: translateX(4px);
}

.checkbox-input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
}

.checkbox-custom {
  position: relative;
  height: 20px;
  width: 20px;
  background-color: var(--gray-200);
  border-radius: var(--radius-sm);
  margin-right: 0.75rem;
  transition: var(--transition-normal);
}

.checkbox-input:checked ~ .checkbox-custom {
  background-color: var(--primary-color);
}

.checkbox-custom::after {
  content: "";
  position: absolute;
  display: none;
  left: 7px;
  top: 3px;
  width: 5px;
  height: 10px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.checkbox-input:checked ~ .checkbox-custom::after {
  display: block;
}

.checkbox-text {
  color: var(--gray-700);
}

.control-buttons {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.btn {
  padding: 0.75rem 1rem;
  border: none;
  border-radius: var(--radius);
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 500;
  transition: var(--transition-normal);
  position: relative;
  overflow: hidden;
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

.btn-full-width {
  width: 100%;
  justify-content: flex-start;
  padding: 0.75rem 1rem;
}

.btn-full-width:hover:not(:disabled) {
  background-color: var(--gray-50);
  padding-left: 1.25rem;
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

.btn.active {
  background: linear-gradient(135deg, var(--success-color) 0%, #22c55e 100%);
  color: white;
}

.vehicle-info {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--gray-100);
}

.info-label {
  font-weight: 500;
  color: var(--gray-600);
  flex-shrink: 0;
}

.info-value {
  color: var(--gray-800);
  text-align: right;
  flex: 1;
  margin-left: 1rem;
}

.speed-highlight {
  color: var(--primary-color);
  font-weight: 600;
  background: linear-gradient(45deg, var(--primary-color), var(--accent-color));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .map-content {
    grid-template-columns: 1fr;
  }
  
  .view-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
}
</style>