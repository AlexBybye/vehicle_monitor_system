<template>
  <div class="statistics-view">
    <div class="view-header">
      <div class="header-left">
        <h2 class="title">📊 统计分析</h2>
        <p class="subtitle">实时综合指标 · 来自当前监控系统</p>
      </div>
      <button @click="refreshAll" class="btn btn-primary" :disabled="loading">
        <span v-if="loading">🔄 加载中…</span>
        <span v-else>🔄 刷新</span>
      </button>
    </div>

    <div class="stats-overview">
      <div class="stat-card card stat-card--primary">
        <div class="stat-header">
          <div class="stat-icon">🚗</div>
          <h3 class="stat-title">区域内活动车辆</h3>
        </div>
        <p class="stat-number">{{ activeVehicles }}</p>
        <p class="stat-sub">总记录 {{ totalVehicles }} 辆，已离开 {{ leftVehicles }} 辆</p>
      </div>

      <div class="stat-card card stat-card--success">
        <div class="stat-header">
          <div class="stat-icon">🏎️</div>
          <h3 class="stat-title">平均车速</h3>
        </div>
        <p class="stat-number">
          <template v-if="avgSpeed !== null">{{ avgSpeed.toFixed(1) }}<small> km/h</small></template>
          <template v-else>—</template>
        </p>
        <p class="stat-sub">基于 {{ speedSampleSize }} 条历史速度</p>
      </div>

      <div class="stat-card card stat-card--info">
        <div class="stat-header">
          <div class="stat-icon">⏱️</div>
          <h3 class="stat-title">平均停留时间</h3>
        </div>
        <p class="stat-number">
          <template v-if="avgStayMinutes !== null">{{ avgStayMinutes.toFixed(1) }}<small> 分钟</small></template>
          <template v-else>—</template>
        </p>
        <p class="stat-sub">基于 {{ staySampleSize }} 条进出记录</p>
      </div>

      <div class="stat-card card stat-card--warning">
        <div class="stat-header">
          <div class="stat-icon">🚦</div>
          <h3 class="stat-title">当前拥堵路径</h3>
        </div>
        <p class="stat-number">{{ congestionCount }}</p>
        <p class="stat-sub">中度及以上 ({{ heavyCongestionCount }} 严重)</p>
      </div>
    </div>

    <div class="charts-grid">
      <div class="chart-section card">
        <div class="chart-header">
          <h3>🚪 各出入口通行总数</h3>
          <span class="chart-tag">实时 · 来自 getStatisticsByEntry</span>
        </div>
        <ChartPanel :data="entryFlowData" chart-type="bar" title="" />
      </div>

      <div class="chart-section card">
        <div class="chart-header">
          <h3>🕐 各小时进入分布</h3>
          <span class="chart-tag">已加载历史 · 今日</span>
        </div>
        <ChartPanel :data="hourlyFlowData" chart-type="line" title="" />
      </div>

      <div class="chart-section card chart-section--full">
        <div class="chart-header">
          <h3>🛣️ 各检查点车辆数分布</h3>
          <span class="chart-tag">实时 · 半径 50px</span>
        </div>
        <ChartPanel :data="checkpointDistribution" chart-type="pie" title="" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useTrafficStore } from '@/store/trafficStore';
import ChartPanel from '@/components/ChartPanel.vue';
import { formatDate } from '@/utils';

const store = useTrafficStore();
const loading = ref(false);

// 真数据：活动车辆 / 离开车辆
const totalVehicles = computed(() => store.vehicles.length);
const leftVehicles = computed(() =>
  store.vehicles.filter(v => v.Position.Pos_X === 0 && v.Position.Pos_Y === 0).length
);
const activeVehicles = computed(() => totalVehicles.value - leftVehicles.value);

// 平均车速：基于历史记录 Speed
const speedSamples = computed(() =>
  store.historyRecords.map(r => r.Speed).filter((s): s is number => typeof s === 'number' && s > 0)
);
const speedSampleSize = computed(() => speedSamples.value.length);
const avgSpeed = computed(() => {
  const arr = speedSamples.value;
  if (arr.length === 0) return null;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
});

// 平均停留时间：基于历史记录 EnterTime / ExitTime（.NET 时间格式）
function parseDotNetTime(s?: string): number | null {
  if (!s) return null;
  const m = s.match(/\/Date\((\d+)([+-]\d+)?\)\//);
  return m && m[1] ? parseInt(m[1], 10) : null;
}
const stayDurations = computed(() => {
  const out: number[] = [];
  for (const r of store.historyRecords) {
    const enter = parseDotNetTime(r.EnterTime);
    const exit = parseDotNetTime(r.ExitTime);
    if (enter !== null && exit !== null && exit > enter) {
      out.push((exit - enter) / 60000);
    }
  }
  return out;
});
const staySampleSize = computed(() => stayDurations.value.length);
const avgStayMinutes = computed(() => {
  const arr = stayDurations.value;
  if (arr.length === 0) return null;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
});

// 拥堵：≥ level 2 的主路径数（不含 #子段）
const congestionCount = computed(() =>
  Object.entries(store.pathCongestion)
    .filter(([id, ps]) => !id.includes('#') && ps.congestionLevel >= 2)
    .length
);
const heavyCongestionCount = computed(() =>
  Object.entries(store.pathCongestion)
    .filter(([id, ps]) => !id.includes('#') && ps.congestionLevel >= 3)
    .length
);

// 出入口流量：用真实接口 getStatisticsByEntry 拉取每个出入口的进+出
const entryStats = ref<Record<string, { Enter: number; Exit: number }>>({});
const entryFlowData = computed(() => {
  return store.entries.map(e => {
    const s = entryStats.value[e.No];
    const total = s ? (s.Enter || 0) + (s.Exit || 0) : 0;
    return { label: e.Name, value: total };
  });
});

// 各小时进入分布：基于已加载历史
const hourlyFlowData = computed(() => {
  const buckets = Array(24).fill(0);
  for (const r of store.historyRecords) {
    const t = parseDotNetTime(r.EnterTime);
    if (t === null) continue;
    const h = new Date(t).getHours();
    if (h >= 0 && h < 24) buckets[h]++;
  }
  return buckets.map((v, i) => ({ label: `${i}时`, value: v }));
});

// 检查点拥堵分布：用 store.pathCongestion 里 checkpoint-* 的 vehicleCount
const checkpointDistribution = computed(() =>
  store.checkpoints.map(c => {
    const seg = store.pathCongestion[`checkpoint-${c.No}`];
    return { label: c.Name, value: seg?.vehicleCount ?? 0 };
  })
);

const refreshAll = async () => {
  loading.value = true;
  try {
    await Promise.all([
      store.fetchEntries(),
      store.fetchCheckpoints(),
      store.fetchVehiclePositions(),
    ]);
    // 拉每个出入口的真实统计
    const results = await Promise.all(
      store.entries.map(async e => [e.No, await store.fetchStatisticsByEntry(e.No)] as const)
    );
    const next: Record<string, { Enter: number; Exit: number }> = {};
    for (const [no, s] of results) {
      next[no] = s as { Enter: number; Exit: number };
    }
    entryStats.value = next;
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  refreshAll();
});
</script>

<style scoped>
.statistics-view {
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
.title {
  margin: 0;
  font-size: 1.5rem;
  color: var(--gray-800);
  font-weight: 700;
}
.subtitle {
  margin: 0;
  font-size: 0.85rem;
  color: var(--gray-500);
}

.btn {
  padding: 0.65rem 1.1rem;
  border: none;
  border-radius: var(--radius);
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 500;
  transition: var(--transition-normal);
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}
.btn:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-primary {
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
  color: white;
}
.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.stats-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.25rem;
  margin-bottom: 1.5rem;
}

.stat-card {
  position: relative;
  padding: 1.25rem 1.5rem;
  background: white;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  transition: var(--transition-normal);
  overflow: hidden;
}
.stat-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 4px;
}
.stat-card--primary::before { background: linear-gradient(90deg, #4361ee, #4cc9f0); }
.stat-card--success::before { background: linear-gradient(90deg, #22c55e, #4ade80); }
.stat-card--info::before { background: linear-gradient(90deg, #38bdf8, #7dd3fc); }
.stat-card--warning::before { background: linear-gradient(90deg, #f59e0b, #facc15); }

.stat-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-lg);
}

.stat-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}
.stat-icon {
  font-size: 1.4rem;
  width: 38px;
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius);
  background: var(--gray-100);
}
.stat-title {
  margin: 0;
  font-size: 0.9rem;
  color: var(--gray-600);
  font-weight: 500;
}
.stat-number {
  margin: 0;
  font-size: 2.4rem;
  font-weight: 700;
  color: var(--gray-900);
  letter-spacing: -0.02em;
  line-height: 1.1;
}
.stat-number small {
  font-size: 1rem;
  font-weight: 500;
  color: var(--gray-500);
  margin-left: 0.25rem;
}
.stat-sub {
  margin: 0.5rem 0 0 0;
  font-size: 0.8rem;
  color: var(--gray-500);
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
  gap: 1.25rem;
}

.chart-section {
  padding: 1.25rem 1.5rem;
  background: white;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}
.chart-section--full { grid-column: 1 / -1; }

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}
.chart-header h3 {
  margin: 0;
  font-size: 1.05rem;
  color: var(--gray-800);
  font-weight: 600;
}
.chart-tag {
  font-size: 0.75rem;
  color: var(--gray-500);
  padding: 0.2rem 0.6rem;
  background: var(--gray-100);
  border-radius: var(--radius-full);
}

@media (max-width: 768px) {
  .charts-grid { grid-template-columns: 1fr; }
}
</style>
