<template>
  <div class="statistics-view">
    <div class="view-header">
      <div class="header-left">
        <h2 class="title">📊 统计分析</h2>
        <p class="subtitle">实时综合指标 · 来自当前监控系统</p>
      </div>
      <div class="header-actions">
        <button @click="refreshAll" class="btn btn-primary" :disabled="loading">
          <span v-if="loading">🔄 加载中…</span>
          <span v-else>🔄 刷新</span>
        </button>
        <button
          @click="toggleAutoRefresh"
          class="btn"
          :class="autoRefresh ? 'btn-success' : 'btn-secondary'"
        >
          <span v-if="autoRefresh">⏸️ 停止自动刷新</span>
          <span v-else>▶️ 自动刷新 (3s)</span>
        </button>
      </div>
    </div>

    <div class="stats-overview">
      <div class="stat-card card stat-card--primary">
        <div class="stat-header">
          <div class="stat-icon">🚗</div>
          <h3 class="stat-title">区域内活动车辆</h3>
        </div>
        <p class="stat-number">{{ activeVehicles }}</p>
        <p class="stat-sub">总记录 {{ speedSampleSize}} 辆</p>
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

      <div class="stat-card card stat-card--charge">
        <div class="stat-header">
          <div class="stat-icon">💰</div>
          <h3 class="stat-title">累计通行费用</h3>
        </div>
        <p class="stat-number">
          <template v-if="totalCharge !== null">¥{{ totalCharge.toFixed(1) }}</template>
          <template v-else>—</template>
        </p>
        <p class="stat-sub">来自 getStatisticsByVehicle 汇总</p>
      </div>
    </div>

    <div class="charts-grid">
      <div class="chart-section card">
        <div class="chart-header">
          <h3>🚪 各出入口累计通行车辆数</h3>
        </div>
        <ChartPanel :data="entryFlowData" chart-type="bar" title="" />
      </div>

      <div class="chart-section card">
        <div class="chart-header">
          <h3>🚦 各出入口进/出统计（接口）</h3>
        </div>
        <ChartPanel :data="entryApiFlowData" chart-type="bar" title="" />
      </div>

      <div class="chart-section card">
        <div class="chart-header">
          <h3>🕐 过去一小时进入分布（每 5 分钟）</h3>
        </div>
        <ChartPanel :data="pastHourFlowData" chart-type="line" title="" />
      </div>

      <div class="chart-section card chart-section--full">
        <div class="chart-header">
          <h3>🛣️ 各检查点车辆数分布</h3>
          <div class="chart-toggle">
            <button
              class="toggle-btn"
              :class="{ active: checkpointMode === 'realtime' }"
              @click="checkpointMode = 'realtime'"
            >实时</button>
            <button
              class="toggle-btn"
              :class="{ active: checkpointMode === 'cumulative' }"
              @click="checkpointMode = 'cumulative'"
            >累计</button>
          </div>
        </div>
        <ChartPanel :data="checkpointDistribution" chart-type="pie" title="" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useTrafficStore } from '@/store/trafficStore';
import ChartPanel from '@/components/ChartPanel.vue';
import type { StatisticsByEntry } from '@/types';

const store = useTrafficStore();
const loading = ref(false);
const autoRefresh = ref(false);
let refreshInterval: ReturnType<typeof setInterval> | null = null;

// 检查点分布显示模式：实时 / 累计
const checkpointMode = ref<'realtime' | 'cumulative'>('realtime');

// 来自接口的统计：累计费用（getStatisticsByVehicle）与各出入口进出（getStatisticsByEntry）
const totalCharge = ref<number | null>(null);
const entryApiStats = ref<Record<string, StatisticsByEntry>>({});

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

// 出入口累计通行车辆数：从历史记录派生（每条记录 = 一次通行；同车再次出现自然 +1）
// EnterName / ExitName 都计入对应出入口的"通行总数"
const entryFlowData = computed(() => {
  const counts: Record<string, number> = {};
  for (const r of store.historyRecords) {
    if (r.EnterName) counts[r.EnterName] = (counts[r.EnterName] || 0) + 1;
    if (r.ExitName) counts[r.ExitName] = (counts[r.ExitName] || 0) + 1;
  }
  return store.entries.map(e => ({
    label: e.Name,
    value: counts[e.Name] || 0,
  }));
});

// 过去一小时每 5 分钟进入分布：从历史记录的 EnterTime 派生
// 把 (now - 1h, now] 区间内的记录按 5 分钟一桶分到 12 个桶
const pastHourFlowData = computed(() => {
  const now = Date.now();
  const buckets = Array(12).fill(0);
  for (const r of store.historyRecords) {
    const t = parseDotNetTime(r.EnterTime);
    if (t === null) continue;
    const diffMs = now - t;
    if (diffMs < 0 || diffMs > 60 * 60 * 1000) continue;
    const idx = 11 - Math.floor(diffMs / (5 * 60 * 1000));
    if (idx >= 0 && idx < 12) buckets[idx]++;
  }
  return buckets.map((v, i) => {
    const minsAgo = (11 - i) * 5;
    const label = minsAgo === 0 ? '现在' : `-${minsAgo}m`;
    return { label, value: v };
  });
});

// 检查点分布：
// - 实时：store.pathCongestion 中 checkpoint-* 当前车辆数
// - 累计：每次车辆从"不在某检查点 50px 范围"变为"在范围"时该检查点 +1（事件计数器）
const checkpointDistribution = computed(() =>
  store.checkpoints.map(c => {
    if (checkpointMode.value === 'cumulative') {
      return { label: c.Name, value: store.cumulativeCheckpointPasses[c.No] || 0 };
    }
    const seg = store.pathCongestion[`checkpoint-${c.No}`];
    return { label: c.Name, value: seg?.vehicleCount ?? 0 };
  })
);

// 各出入口进入 / 离开数（数据源：getStatisticsByEntry 接口）
// 将每个口拆成"入口名(进)""入口名(出)"两条柱，直观对比进出量
const entryApiFlowData = computed(() => {
  const out: Array<{ label: string; value: number }> = [];
  for (const e of store.entries) {
    const s = entryApiStats.value[e.No];
    if (!s) continue;
    const shortName = e.Name.replace('出入口', '');
    out.push({ label: `${shortName}·进`, value: s.Enter });
    out.push({ label: `${shortName}·出`, value: s.Exit });
  }
  return out;
});

// 拉取一轮统计所需的全部数据源（供手动刷新与自动刷新复用）
const refreshData = async () => {
  await Promise.all([
    store.fetchEntries(),
    store.fetchCheckpoints(),
    store.fetchVehiclePositions(),
  ]);
  // 拉取所有车辆历史 - 累计统计与过去一小时分布的数据源
  await store.fetchAllVehiclesHistory();
  // 接口统计：累计费用 + 各出入口进出
  totalCharge.value = await store.fetchTotalChargeStatistics();
  entryApiStats.value = await store.fetchAllEntryStatistics();
};

const refreshAll = async () => {
  loading.value = true;
  try {
    await refreshData();
  } finally {
    loading.value = false;
  }
};

const toggleAutoRefresh = () => {
  autoRefresh.value = !autoRefresh.value;
  if (autoRefresh.value) {
    // 自动刷新与手动刷新走同一函数，确保累计费用 / 各出入口进出也随之更新
    refreshInterval = setInterval(refreshData, 3000);
  } else if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
};

onMounted(async () => {
  await refreshAll();
  // 默认开启 3s 自动刷新
  if (!autoRefresh.value) toggleAutoRefresh();
});

onUnmounted(() => {
  if (refreshInterval) clearInterval(refreshInterval);
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
.btn-secondary { background: var(--gray-200); color: var(--gray-800); }
.btn-secondary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: var(--shadow-md); }
.btn-success { background: linear-gradient(135deg, #22c55e, #16a34a); color: white; }
.btn-success:hover:not(:disabled) { transform: translateY(-1px); box-shadow: var(--shadow-md); }

.header-actions { display: flex; gap: 0.5rem; }

.chart-toggle { display: inline-flex; gap: 0.25rem; background: var(--gray-100); padding: 0.2rem; border-radius: var(--radius-full); }
.toggle-btn {
  padding: 0.3rem 0.85rem;
  border: none;
  background: transparent;
  border-radius: var(--radius-full);
  font-size: 0.8rem;
  color: var(--gray-600);
  cursor: pointer;
  transition: var(--transition-normal);
}
.toggle-btn.active { background: white; color: var(--primary-color); box-shadow: var(--shadow-sm); font-weight: 600; }

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
.stat-card--charge::before { background: linear-gradient(90deg, #ec4899, #f472b6); }
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
