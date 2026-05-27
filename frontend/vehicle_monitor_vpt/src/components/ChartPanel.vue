<template>
  <div class="chart-panel">
    <div v-if="title || $slots.controls" class="chart-toolbar">
      <h3 v-if="title">{{ title }}</h3>
      <div class="chart-controls">
        <select v-model="chartType" class="chart-select" v-if="allowTypeChange">
          <option value="bar">柱状图</option>
          <option value="line">折线图</option>
          <option value="pie">饼图</option>
        </select>
      </div>
    </div>
    <div class="chart-container" ref="containerRef">
      <canvas ref="chartCanvas" />
      <div v-if="isEmpty" class="chart-empty">暂无数据</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';

interface Props {
  title?: string;
  data: Array<{ label: string; value: number }>;
  chartType?: 'bar' | 'line' | 'pie';
  allowTypeChange?: boolean;
  height?: number;
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  chartType: 'bar',
  allowTypeChange: true,
  height: 280,
});

const chartCanvas = ref<HTMLCanvasElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);
const chartType = ref<'bar' | 'line' | 'pie'>(props.chartType);
const isEmpty = ref(false);

const palette = [
  '#4361ee', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#10b981', '#f97316', '#0ea5e9',
];

function dpr() {
  return Math.max(1, window.devicePixelRatio || 1);
}

function setupCanvas(): { ctx: CanvasRenderingContext2D; w: number; h: number } | null {
  const canvas = chartCanvas.value;
  const container = containerRef.value;
  if (!canvas || !container) return null;
  const ratio = dpr();
  const w = container.clientWidth;
  const h = props.height;
  canvas.width = w * ratio;
  canvas.height = h * ratio;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, w, h);
  return { ctx, w, h };
}

function niceMax(value: number): number {
  if (value <= 0) return 1;
  const exp = Math.floor(Math.log10(value));
  const base = Math.pow(10, exp);
  const f = value / base;
  let nf;
  if (f <= 1) nf = 1;
  else if (f <= 2) nf = 2;
  else if (f <= 5) nf = 5;
  else nf = 10;
  return nf * base;
}

function drawAxes(
  ctx: CanvasRenderingContext2D,
  pad: { l: number; r: number; t: number; b: number },
  w: number, h: number,
  maxValue: number,
  yTicks = 5,
) {
  ctx.strokeStyle = '#e5e7eb';
  ctx.fillStyle = '#6b7280';
  ctx.lineWidth = 1;
  ctx.font = '11px Inter, system-ui, sans-serif';
  ctx.textBaseline = 'middle';

  for (let i = 0; i <= yTicks; i++) {
    const y = pad.t + ((h - pad.t - pad.b) * i) / yTicks;
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(w - pad.r, y);
    ctx.stroke();
    const value = maxValue - (maxValue * i) / yTicks;
    ctx.textAlign = 'right';
    ctx.fillText(String(Math.round(value)), pad.l - 6, y);
  }

  ctx.strokeStyle = '#cbd5e1';
  ctx.beginPath();
  ctx.moveTo(pad.l, pad.t);
  ctx.lineTo(pad.l, h - pad.b);
  ctx.lineTo(w - pad.r, h - pad.b);
  ctx.stroke();
}

function drawBar(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const data = props.data;
  if (data.length === 0) return;
  const pad = { l: 44, r: 16, t: 16, b: 36 };
  const maxValue = niceMax(Math.max(...data.map(d => d.value), 1));
  drawAxes(ctx, pad, w, h, maxValue);

  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const slot = innerW / data.length;
  const barW = Math.min(40, slot * 0.6);

  ctx.font = '11px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';

  data.forEach((item, i) => {
    const cx = pad.l + slot * i + slot / 2;
    const barH = (item.value / maxValue) * innerH;
    const y = h - pad.b - barH;

    const grad = ctx.createLinearGradient(0, y, 0, h - pad.b);
    grad.addColorStop(0, '#4361ee');
    grad.addColorStop(1, '#7dd3fc');
    ctx.fillStyle = grad;
    roundRect(ctx, cx - barW / 2, y, barW, barH, 4);
    ctx.fill();

    if (item.value > 0) {
      ctx.fillStyle = '#374151';
      ctx.fillText(String(item.value), cx, y - 6);
    }

    ctx.fillStyle = '#6b7280';
    const lbl = truncate(item.label, slot);
    ctx.fillText(lbl, cx, h - pad.b + 16);
  });
}

function drawLine(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const data = props.data;
  if (data.length === 0) return;
  const pad = { l: 44, r: 16, t: 16, b: 36 };
  const maxValue = niceMax(Math.max(...data.map(d => d.value), 1));
  drawAxes(ctx, pad, w, h, maxValue);

  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const stepX = data.length > 1 ? innerW / (data.length - 1) : 0;

  const points = data.map((d, i) => ({
    x: pad.l + stepX * i,
    y: h - pad.b - (d.value / maxValue) * innerH,
    v: d.value,
    label: d.label,
  }));

  // 渐变填充
  const fill = ctx.createLinearGradient(0, pad.t, 0, h - pad.b);
  fill.addColorStop(0, 'rgba(67, 97, 238, 0.25)');
  fill.addColorStop(1, 'rgba(67, 97, 238, 0)');
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(points[0]!.x, h - pad.b);
  points.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.lineTo(points[points.length - 1]!.x, h - pad.b);
  ctx.closePath();
  ctx.fill();

  // 折线
  ctx.strokeStyle = '#4361ee';
  ctx.lineWidth = 2;
  ctx.beginPath();
  points.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();

  // 数据点
  ctx.fillStyle = '#4361ee';
  points.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
  });

  // 轴标签
  ctx.font = '11px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#6b7280';
  ctx.textAlign = 'center';
  const stride = Math.max(1, Math.ceil(data.length / 12));
  points.forEach((p, i) => {
    if (i % stride === 0 || i === points.length - 1) {
      ctx.fillText(truncate(p.label, stepX * stride), p.x, h - pad.b + 16);
    }
  });
}

function drawPie(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const data = props.data.filter(d => d.value > 0);
  if (data.length === 0) {
    isEmpty.value = true;
    return;
  }
  const total = data.reduce((s, d) => s + d.value, 0);
  const cx = w / 2 - 60;
  const cy = h / 2;
  const radius = Math.min(cx, cy) - 14;
  let start = -Math.PI / 2;

  data.forEach((d, i) => {
    const slice = (d.value / total) * Math.PI * 2;
    ctx.fillStyle = palette[i % palette.length]!;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, start, start + slice);
    ctx.closePath();
    ctx.fill();
    start += slice;
  });

  // 中心圆，做成环形
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1f2937';
  ctx.font = 'bold 14px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(total), cx, cy - 6);
  ctx.font = '11px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#6b7280';
  ctx.fillText('总计', cx, cy + 10);

  // 图例
  const lx = w - 150;
  let ly = 18;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = '12px Inter, system-ui, sans-serif';
  data.forEach((d, i) => {
    ctx.fillStyle = palette[i % palette.length]!;
    roundRect(ctx, lx, ly - 6, 12, 12, 3);
    ctx.fill();
    ctx.fillStyle = '#374151';
    const pct = ((d.value / total) * 100).toFixed(1);
    ctx.fillText(`${truncate(d.label, 110)} ${d.value} (${pct}%)`, lx + 18, ly);
    ly += 20;
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function truncate(label: string, slotWidth: number) {
  const max = Math.max(2, Math.floor(slotWidth / 8));
  if (label.length <= max) return label;
  return label.slice(0, Math.max(1, max - 1)) + '…';
}

const render = () => {
  isEmpty.value = props.data.length === 0 || props.data.every(d => d.value === 0);
  const setup = setupCanvas();
  if (!setup) return;
  const { ctx, w, h } = setup;
  if (isEmpty.value) return;
  switch (chartType.value) {
    case 'bar': drawBar(ctx, w, h); break;
    case 'line': drawLine(ctx, w, h); break;
    case 'pie': drawPie(ctx, w, h); break;
  }
};

watch(() => props.data, () => render(), { deep: true });
watch(chartType, () => render());
watch(() => props.chartType, v => { chartType.value = v; });

let resizeObserver: ResizeObserver | null = null;
onMounted(() => {
  nextTick(render);
  if (typeof ResizeObserver !== 'undefined' && containerRef.value) {
    resizeObserver = new ResizeObserver(() => render());
    resizeObserver.observe(containerRef.value);
  } else {
    window.addEventListener('resize', render);
  }
});

onUnmounted(() => {
  if (resizeObserver) resizeObserver.disconnect();
  window.removeEventListener('resize', render);
});
</script>

<style scoped>
.chart-panel {
  display: flex;
  flex-direction: column;
}
.chart-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}
.chart-toolbar h3 {
  margin: 0;
  font-size: 1rem;
  color: var(--gray-800);
  font-weight: 600;
}
.chart-controls { display: flex; gap: 0.5rem; }
.chart-select {
  padding: 0.35rem 0.6rem;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius);
  background: white;
  font-size: 0.85rem;
  color: var(--gray-700);
  cursor: pointer;
}
.chart-container {
  width: 100%;
  position: relative;
}
.chart-container canvas { display: block; width: 100%; }
.chart-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--gray-400);
  font-size: 0.9rem;
}
</style>
