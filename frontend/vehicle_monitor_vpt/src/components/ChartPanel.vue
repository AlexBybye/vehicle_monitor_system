<template>
  <div class="chart-panel">
    <div class="chart-header">
      <h3>{{ title }}</h3>
      <div class="chart-controls">
        <select v-model="chartType" @change="renderChart" class="chart-type-select">
          <option value="bar">柱状图</option>
          <option value="line">折线图</option>
          <option value="pie">饼图</option>
        </select>
        <select v-model="timeRange" @change="updateData" class="time-range-select">
          <option value="day">今日</option>
          <option value="week">本周</option>
          <option value="month">本月</option>
          <option value="all">全部</option>
        </select>
      </div>
    </div>
    <div class="chart-container">
      <canvas ref="chartCanvas" :width="chartWidth" :height="chartHeight"></canvas>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';

interface Props {
  title: string;
  data: Array<{ label: string; value: number }>;
  chartWidth?: number;
  chartHeight?: number;
}

const props = withDefaults(defineProps<Props>(), {
  chartWidth: 400,
  chartHeight: 300
});

const chartCanvas = ref<HTMLCanvasElement | null>(null);
const chartType = ref<'bar' | 'line' | 'pie'>('bar');
const timeRange = ref<'day' | 'week' | 'month' | 'all'>('all');

// 图表绘制函数
const renderChart = () => {
  if (!chartCanvas.value) return;
  
  const ctx = chartCanvas.value.getContext('2d');
  if (!ctx) return;
  
  // 清空画布
  ctx.clearRect(0, 0, props.chartWidth, props.chartHeight);
  
  // 根据图表类型绘制
  switch (chartType.value) {
    case 'bar':
      drawBarChart(ctx);
      break;
    case 'line':
      drawLineChart(ctx);
      break;
    case 'pie':
      drawPieChart(ctx);
      break;
  }
};

// 绘制柱状图
const drawBarChart = (ctx: CanvasRenderingContext2D) => {
  if (props.data.length === 0) return;
  
  const barWidth = (props.chartWidth - 60) / props.data.length;
  const maxValue = Math.max(...props.data.map(d => d.value), 1);
  
  ctx.fillStyle = '#4CAF50';
  
  props.data.forEach((item, index) => {
    const x = 30 + index * barWidth + barWidth / 4;
    const barHeight = (item.value / maxValue) * (props.chartHeight - 60);
    const y = props.chartHeight - 30 - barHeight;
    
    // 绘制柱子
    ctx.fillRect(x, y, barWidth / 2, barHeight);
    
    // 绘制标签
    ctx.fillStyle = '#000';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(item.label, x + barWidth / 4, props.chartHeight - 15);
    
    // 绘制数值
    ctx.fillText(item.value.toString(), x + barWidth / 4, y - 5);
    
    ctx.fillStyle = '#4CAF50';
  });
};

// 绘制折线图
const drawLineChart = (ctx: CanvasRenderingContext2D) => {
  if (props.data.length === 0) return;
  
  const pointSpacing = (props.chartWidth - 60) / Math.max(props.data.length - 1, 1);
  const maxValue = Math.max(...props.data.map(d => d.value), 1);
  
  ctx.beginPath();
  ctx.strokeStyle = '#2196F3';
  ctx.lineWidth = 2;
  
  props.data.forEach((item, index) => {
    const x = 30 + index * pointSpacing;
    const y = props.chartHeight - 30 - (item.value / maxValue) * (props.chartHeight - 60);
    
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
    
    // 绘制数据点
    ctx.fillStyle = '#2196F3';
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    
    // 绘制标签
    ctx.fillStyle = '#000';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(item.label, x, props.chartHeight - 15);
    
    // 绘制数值
    ctx.fillText(item.value.toString(), x, y - 8);
  });
  
  ctx.stroke();
};

// 绘制饼图
const drawPieChart = (ctx: CanvasRenderingContext2D) => {
  if (props.data.length === 0) return;
  
  const centerX = props.chartWidth / 2;
  const centerY = props.chartHeight / 2;
  const radius = Math.min(centerX, centerY) - 30;
  
  let startAngle = 0;
  const total = props.data.reduce((sum, item) => sum + item.value, 0);
  
  const colors = [
    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
    '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
  ];
  
  props.data.forEach((item, index) => {
    const sliceAngle = (item.value / total) * 2 * Math.PI;
    
    // 绘制扇形
    const colorIndex = index % colors.length;
    ctx.fillStyle = colors[colorIndex] || '#666666'; // 提供默认颜色以防万一
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
    ctx.closePath();
    ctx.fill();
    
    // 绘制标签
    const labelAngle = startAngle + sliceAngle / 2;
    const labelRadius = radius + 20;
    const labelX = centerX + Math.cos(labelAngle) * labelRadius * 0.7;
    const labelY = centerY + Math.sin(labelAngle) * labelRadius * 0.7;
    
    ctx.fillStyle = '#000';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${item.label}: ${item.value}`, labelX, labelY);
    
    startAngle += sliceAngle;
  });
};

// 更新数据
const updateData = () => {
  // 根据时间范围筛选数据
  // 这里是示例，实际应用中会根据具体的时间字段进行筛选
  renderChart();
};

// 监听数据变化
watch(() => props.data, () => {
  renderChart();
}, { deep: true });

// 监听图表类型变化
watch(chartType, () => {
  renderChart();
});

// 初始化图表
onMounted(() => {
  renderChart();
});

// 清理
onUnmounted(() => {
  // 如有必要，在这里清理资源
});
</script>

<style scoped>
.chart-panel {
  background-color: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  margin: 10px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.chart-header h3 {
  margin: 0;
  color: #333;
}

.chart-controls {
  display: flex;
  gap: 10px;
}

.chart-type-select, .time-range-select {
  padding: 5px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.chart-container {
  display: flex;
  justify-content: center;
}
</style>