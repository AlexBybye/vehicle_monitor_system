<template>
  <div class="congestion-view">
    <div class="view-header">
      <div class="header-left">
        <h2 class="title">🚦 路径拥挤分析</h2>
        <p class="subtitle">实时车辆密度 · 来自 calculatePathCongestion</p>
      </div>
      <div class="view-controls">
        <button @click="refreshOnce" class="btn btn-secondary">🔄 刷新</button>
        <button
          @click="toggleAutoRefresh"
          class="btn"
          :class="autoRefresh ? 'btn-success' : 'btn-primary'"
        >
          <span v-if="autoRefresh">⏸️ 停止自动刷新</span>
          <span v-else>▶️ 自动刷新 (3s)</span>
        </button>
      </div>
    </div>

    <div class="congestion-summary">
      <div class="summary-card card" :class="`accent-${maxCongestionLevel}`">
        <div class="summary-header">
          <h3 class="summary-title">📊 当前最高等级</h3>
          <div class="summary-icon">📈</div>
        </div>
        <p class="summary-value">{{ levelText(maxCongestionLevel) }}</p>
        <div class="summary-status">
          <span class="badge" :class="`badge-${maxCongestionLevel}`">
            {{ levelDescription(maxCongestionLevel) }}
          </span>
        </div>
      </div>

      <div class="summary-card card accent-2">
        <div class="summary-header">
          <h3 class="summary-title">🛣️ 拥堵路径数</h3>
          <div class="summary-icon">⚠️</div>
        </div>
        <p class="summary-value">{{ congestedPathsCount }}</p>
        <div class="summary-status">
          <span class="muted">中度及以上 ({{ heavyPathsCount }} 严重)</span>
        </div>
      </div>

      <div class="summary-card card accent-3">
        <div class="summary-header">
          <h3 class="summary-title">🚨 预警路径</h3>
          <div class="summary-icon">🚨</div>
        </div>
        <p class="summary-value">{{ alertPathsCount }}</p>
        <div class="summary-status">
          <span class="muted">已触发的严重预警</span>
        </div>
      </div>
    </div>

    <div class="path-list card">
      <div class="list-header">
        <h3>🛣️ 路径拥堵详情</h3>
        <div class="filter-tabs">
          <button
            v-for="tab in filterTabs"
            :key="tab.value"
            class="tab"
            :class="{ active: filter === tab.value }"
            @click="filter = tab.value"
          >
            {{ tab.label }}
            <span class="tab-count">{{ countForTab(tab.value) }}</span>
          </button>
        </div>
      </div>
      <div class="congestion-list">
        <div v-if="filteredPaths.length === 0" class="empty-state">
          没有匹配的路径
        </div>
        <div
          v-for="ps in filteredPaths"
          :key="ps.id"
          class="path-item"
          :class="`accent-${ps.congestionLevel}`"
        >
          <div class="path-row">
            <div class="path-name">
              <span class="path-icon">{{ ps.id.startsWith('checkpoint-') ? '📍' : '🛣️' }}</span>
              <span class="name-text">{{ ps.name || ps.id }}</span>
            </div>
            <span class="badge" :class="`badge-${ps.congestionLevel}`">
              {{ levelText(ps.congestionLevel) }}
            </span>
          </div>
          <div class="path-meta">
            <span>当前车辆数：<strong>{{ ps.vehicleCount ?? 0 }}</strong></span>
            <span class="dot">·</span>
            <span>{{ levelDescription(ps.congestionLevel) }}</span>
          </div>
          <div class="level-track">
            <div
              class="level-fill"
              :style="{
                width: `${(ps.congestionLevel / 3) * 100}%`,
                background: levelColor(ps.congestionLevel)
              }"
            />
          </div>
        </div>
      </div>
    </div>

    <div class="map-visualization card">
      <h3 class="visualization-title">🗺️ 拥挤程度地图</h3>
      <div class="map-wrapper">
        <MapCanvas :canvas-width="800" :canvas-height="600" :show-heatmap="true" />
      </div>
    </div>

    <div v-if="alertPathsCount > 0" class="alerts card">
      <h3 class="alert-title">🚨 拥挤预警</h3>
      <div class="alert-list">
        <div
          v-for="ps in alertPaths"
          :key="ps.id"
          class="alert-item"
        >
          <span>📍 {{ ps.name || ps.id }}</span>
          <span class="badge badge-3">严重拥堵</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useTrafficStore } from '@/store/trafficStore';
import MapCanvas from '@/components/MapCanvas.vue';
import type { PathSegment } from '@/types';

const store = useTrafficStore();
const autoRefresh = ref(false);
let refreshInterval: ReturnType<typeof setInterval> | null = null;

// 过滤掉用于地图渲染的子段（id 含 #）
const allMainPaths = computed<PathSegment[]>(() =>
  Object.values(store.pathCongestion).filter(ps => !ps.id.includes('#'))
);

const maxCongestionLevel = computed(() =>
  Math.max(...allMainPaths.value.map(ps => ps.congestionLevel), 0)
);
const congestedPathsCount = computed(() =>
  allMainPaths.value.filter(ps => ps.congestionLevel >= 2).length
);
const heavyPathsCount = computed(() =>
  allMainPaths.value.filter(ps => ps.congestionLevel >= 3).length
);
const alertPaths = computed(() =>
  allMainPaths.value.filter(ps => ps.congestionLevel >= 3)
);
const alertPathsCount = computed(() => alertPaths.value.length);

const filter = ref<'all' | 'congested' | 'alert' | 'clear'>('all');
const filterTabs: Array<{ label: string; value: 'all' | 'congested' | 'alert' | 'clear' }> = [
  { label: '全部', value: 'all' },
  { label: '畅通', value: 'clear' },
  { label: '拥堵', value: 'congested' },
  { label: '严重', value: 'alert' },
];
const countForTab = (v: 'all' | 'congested' | 'alert' | 'clear') => {
  switch (v) {
    case 'all': return allMainPaths.value.length;
    case 'clear': return allMainPaths.value.filter(ps => ps.congestionLevel <= 0).length;
    case 'congested': return allMainPaths.value.filter(ps => ps.congestionLevel >= 1).length;
    case 'alert': return allMainPaths.value.filter(ps => ps.congestionLevel >= 3).length;
  }
};

const filteredPaths = computed(() => {
  let list = allMainPaths.value;
  if (filter.value === 'clear') list = list.filter(ps => ps.congestionLevel <= 0);
  else if (filter.value === 'congested') list = list.filter(ps => ps.congestionLevel >= 1);
  else if (filter.value === 'alert') list = list.filter(ps => ps.congestionLevel >= 3);
  return [...list].sort((a, b) => b.congestionLevel - a.congestionLevel || (b.vehicleCount ?? 0) - (a.vehicleCount ?? 0));
});

const levelText = (level: number) => {
  if (level <= 0) return '畅通';
  if (level === 1) return '轻度';
  if (level === 2) return '中度';
  return '严重';
};
const levelDescription = (level: number) => {
  if (level <= 0) return '无车辆 (0 辆)';
  if (level === 1) return '轻度拥堵 (1-3 辆)';
  if (level === 2) return '中度拥堵 (4-6 辆)';
  return '严重拥堵 (≥ 7 辆)';
};
const levelColor = (level: number) => {
  if (level <= 0) return 'linear-gradient(90deg, #22c55e, #4ade80)';
  if (level === 1) return 'linear-gradient(90deg, #facc15, #eab308)';
  if (level === 2) return 'linear-gradient(90deg, #f97316, #ea580c)';
  return 'linear-gradient(90deg, #ef4444, #dc2626)';
};

const refreshOnce = () => store.fetchVehiclePositions();

const toggleAutoRefresh = () => {
  autoRefresh.value = !autoRefresh.value;
  if (autoRefresh.value) {
    refreshInterval = setInterval(refreshOnce, 3000);
  } else if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
};

onMounted(async () => {
  await Promise.all([
    store.fetchEntries(),
    store.fetchCheckpoints(),
    store.fetchVehiclePositions(),
  ]);
});

onUnmounted(() => {
  if (refreshInterval) clearInterval(refreshInterval);
});
</script>

<style scoped>
.congestion-view {
  padding: 1.5rem;
  min-height: 100vh;
  background: linear-gradient(135deg, var(--gray-50) 0%, var(--gray-100) 100%);
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding: 1.25rem 1.5rem;
  background: white;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}
.header-left { display: flex; flex-direction: column; gap: 0.25rem; }
.title { margin: 0; font-size: 1.5rem; font-weight: 700; color: var(--gray-800); }
.subtitle { margin: 0; font-size: 0.85rem; color: var(--gray-500); }

.view-controls { display: flex; gap: 0.5rem; }

.btn {
  padding: 0.6rem 1rem;
  border: none;
  border-radius: var(--radius);
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  transition: var(--transition-normal);
}
.btn:hover { transform: translateY(-1px); box-shadow: var(--shadow-md); }
.btn-primary {
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
  color: white;
}
.btn-secondary { background: var(--gray-100); color: var(--gray-700); }
.btn-success { background: linear-gradient(135deg, #22c55e, #16a34a); color: white; }

.congestion-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.25rem;
  margin-bottom: 1.5rem;
}

.summary-card {
  position: relative;
  padding: 1.25rem 1.5rem;
  background: white;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  transition: var(--transition-normal);
  overflow: hidden;
}
.summary-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 4px;
  background: var(--gray-300);
}
.summary-card.accent-0::before { background: linear-gradient(90deg, #22c55e, #4ade80); }
.summary-card.accent-1::before { background: linear-gradient(90deg, #facc15, #eab308); }
.summary-card.accent-2::before { background: linear-gradient(90deg, #f97316, #ea580c); }
.summary-card.accent-3::before { background: linear-gradient(90deg, #ef4444, #dc2626); }
.summary-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-lg); }

.summary-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}
.summary-title { margin: 0; font-size: 0.9rem; color: var(--gray-600); font-weight: 500; }
.summary-icon { font-size: 1.4rem; }
.summary-value {
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
  color: var(--gray-900);
  line-height: 1.1;
}
.summary-status { margin-top: 0.6rem; }
.muted { font-size: 0.85rem; color: var(--gray-500); }

.badge {
  display: inline-block;
  padding: 0.2rem 0.7rem;
  border-radius: var(--radius-full);
  font-size: 0.8rem;
  font-weight: 600;
}
.badge-0 { background: #dcfce7; color: #15803d; }
.badge-1 { background: #fef9c3; color: #854d0e; }
.badge-2 { background: #ffedd5; color: #9a3412; }
.badge-3 { background: #fee2e2; color: #991b1b; }

.path-list {
  padding: 1.25rem 1.5rem;
  margin-bottom: 1.5rem;
  background: white;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}
.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 1rem;
}
.list-header h3 { margin: 0; font-size: 1.1rem; font-weight: 600; color: var(--gray-800); }

.filter-tabs { display: flex; gap: 0.4rem; }
.tab {
  padding: 0.4rem 0.85rem;
  border: 1px solid var(--gray-200);
  background: white;
  border-radius: var(--radius-full);
  font-size: 0.85rem;
  cursor: pointer;
  color: var(--gray-700);
  transition: var(--transition-fast);
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}
.tab.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}
.tab-count {
  background: rgba(0,0,0,0.06);
  padding: 0 0.45rem;
  border-radius: var(--radius-full);
  font-size: 0.75rem;
}
.tab.active .tab-count { background: rgba(255,255,255,0.25); color: white; }

.congestion-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 0.75rem;
  max-height: 520px;
  overflow-y: auto;
  padding-right: 0.25rem;
}
.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 2rem;
  color: var(--gray-500);
}

.path-item {
  position: relative;
  padding: 0.85rem 1rem;
  border-radius: var(--radius);
  background: var(--gray-50);
  border-left: 4px solid var(--gray-300);
  transition: var(--transition-fast);
}
.path-item.accent-0 { border-left-color: #22c55e; }
.path-item.accent-1 { border-left-color: #eab308; }
.path-item.accent-2 { border-left-color: #ea580c; }
.path-item.accent-3 { border-left-color: #dc2626; background: #fef2f2; }
.path-item:hover { transform: translateX(2px); box-shadow: var(--shadow-sm); }

.path-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}
.path-name {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}
.path-icon { font-size: 1rem; }
.name-text {
  font-weight: 600;
  color: var(--gray-800);
  font-size: 0.95rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.path-meta {
  display: flex;
  gap: 0.4rem;
  align-items: center;
  font-size: 0.8rem;
  color: var(--gray-600);
  margin-top: 0.4rem;
}
.dot { color: var(--gray-300); }
.level-track {
  margin-top: 0.5rem;
  height: 6px;
  background: var(--gray-200);
  border-radius: var(--radius-full);
  overflow: hidden;
}
.level-fill { height: 100%; transition: width 0.3s ease; }

.map-visualization {
  background: white;
  border-radius: var(--radius-lg);
  padding: 1.25rem 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: var(--shadow-sm);
}
.visualization-title {
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  color: var(--gray-800);
  font-weight: 600;
}
.map-wrapper {
  border: 1px solid var(--gray-200);
  border-radius: var(--radius);
  overflow: hidden;
}

.alerts {
  background: white;
  border-radius: var(--radius-lg);
  padding: 1.25rem 1.5rem;
  box-shadow: var(--shadow-sm);
}
.alert-title {
  margin: 0 0 0.85rem 0;
  font-size: 1.1rem;
  color: var(--gray-800);
  font-weight: 600;
}
.alert-list { display: flex; flex-direction: column; gap: 0.5rem; }
.alert-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.65rem 0.85rem;
  background: #fef2f2;
  border-left: 4px solid #dc2626;
  border-radius: var(--radius);
  font-size: 0.9rem;
}

@media (max-width: 768px) {
  .view-header { flex-direction: column; align-items: stretch; gap: 1rem; }
  .congestion-summary { grid-template-columns: 1fr; }
  .congestion-list { grid-template-columns: 1fr; }
}
</style>
