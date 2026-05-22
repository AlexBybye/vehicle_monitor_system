<template>
  <div class="map-container">
    <canvas 
      ref="canvasRef" 
      :width="canvasWidth" 
      :height="canvasHeight"
      @click="handleCanvasClick"
      @mousemove="handleMouseMove"
      @mouseleave="handleMouseLeave"
    />
    <!-- 车辆信息悬浮窗 -->
    <div 
      v-if="hoveredVehicle" 
      class="tooltip" 
      :style="{ top: tooltipY + 'px', left: tooltipX + 'px' }"
    >
      <div><strong>{{ hoveredVehicle.No }}</strong></div>
      <div>位置: ({{ hoveredVehicle.Position.Pos_X }}, {{ hoveredVehicle.Position.Pos_Y }})</div>
      <div v-if="vehicleDetails && vehicleDetails[hoveredVehicle.No]">
        速度: {{ vehicleDetails[hoveredVehicle.No]?.Speed }} km/h
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useTrafficStore } from '@/store/trafficStore';
import type { VehiclePosition, Entry, Checkpoint } from '@/types';

// 定义props
interface Props {
  canvasWidth?: number;
  canvasHeight?: number;
}

const props = withDefaults(defineProps<Props>(), {
  canvasWidth: 800,
  canvasHeight: 600
});

// 引用画布元素
const canvasRef = ref<HTMLCanvasElement | null>(null);

// 悬浮车辆信息
const hoveredVehicle = ref<VehiclePosition | null>(null);
const tooltipX = ref(0);
const tooltipY = ref(0);

// 使用交通状态
const store = useTrafficStore();
const { entries, checkpoints, vehicles, vehicleDetails } = storeToRefs(store);

// 计算属性：过滤掉已离开区域的车辆
const activeVehicles = computed(() => {
  return vehicles.value.filter(v => !(v.Position.Pos_X === 0 && v.Position.Pos_Y === 0));
});

// 鼠标事件处理
const handleCanvasClick = (event: MouseEvent) => {
  if (!canvasRef.value) return;
  
  const rect = canvasRef.value.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  
  // 检查是否点击了某个车辆
  const clickedVehicle = activeVehicles.value.find(vehicle => {
    const distance = Math.sqrt(
      Math.pow(vehicle.Position.Pos_X - x, 2) + 
      Math.pow(vehicle.Position.Pos_Y - y, 2)
    );
    return distance < 15; // 15像素范围内的点击视为有效点击
  });
  
  if (clickedVehicle) {
    store.selectVehicle(clickedVehicle.No);
    // 可以在这里触发车辆详情面板的显示
    console.log('Selected vehicle:', clickedVehicle.No);
  } else {
    store.clearSelection();
  }
};

const handleMouseMove = (event: MouseEvent) => {
  if (!canvasRef.value) return;
  
  const rect = canvasRef.value.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  
  // 查找鼠标悬停的车辆
  const vehicle = activeVehicles.value.find(v => {
    const distance = Math.sqrt(
      Math.pow(v.Position.Pos_X - x, 2) + 
      Math.pow(v.Position.Pos_Y - y, 2)
    );
    return distance < 15; // 15像素范围内
  });
  
  if (vehicle) {
    hoveredVehicle.value = vehicle;
    tooltipX.value = event.pageX;
    tooltipY.value = event.pageY;
  } else {
    hoveredVehicle.value = null;
  }
};

const handleMouseLeave = () => {
  hoveredVehicle.value = null;
};

// 绘制函数
const drawMap = () => {
  if (!canvasRef.value) return;
  
  const ctx = canvasRef.value.getContext('2d');
  if (!ctx) return;
  
  // 清空画布
  ctx.clearRect(0, 0, props.canvasWidth, props.canvasHeight);
  
  // 绘制网格背景
  drawGrid(ctx);
  
  // 绘制出入口
  drawEntries(ctx);
  
  // 绘制检查点
  drawCheckpoints(ctx);
  
  // 绘制路径连接线
  drawPaths(ctx);
  
  // 绘制车辆
  drawVehicles(ctx);
};

// 绘制网格背景
const drawGrid = (ctx: CanvasRenderingContext2D) => {
  ctx.strokeStyle = '#f0f0f0';
  ctx.lineWidth = 1;
  
  // 绘制垂直线
  for (let x = 0; x <= props.canvasWidth; x += 50) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, props.canvasHeight);
    ctx.stroke();
  }
  
  // 绘制水平线
  for (let y = 0; y <= props.canvasHeight; y += 50) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(props.canvasWidth, y);
    ctx.stroke();
  }
};

// 绘制出入口
const drawEntries = (ctx: CanvasRenderingContext2D) => {
  entries.value.forEach(entry => {
    ctx.fillStyle = '#4CAF50'; // 绿色表示出入口
    ctx.beginPath();
    ctx.arc(entry.Position.Pos_X, entry.Position.Pos_Y, 8, 0, Math.PI * 2);
    ctx.fill();
    
    // 绘制出入口名称
    ctx.fillStyle = '#000';
    ctx.font = '12px Arial';
    ctx.fillText(entry.Name, entry.Position.Pos_X + 10, entry.Position.Pos_Y - 10);
  });
};

// 绘制检查点
const drawCheckpoints = (ctx: CanvasRenderingContext2D) => {
  checkpoints.value.forEach(checkpoint => {
    ctx.fillStyle = '#2196F3'; // 蓝色表示检查点
    ctx.beginPath();
    ctx.arc(checkpoint.Position.Pos_X, checkpoint.Position.Pos_Y, 6, 0, Math.PI * 2);
    ctx.fill();
    
    // 绘制检查点名称
    ctx.fillStyle = '#000';
    ctx.font = '12px Arial';
    ctx.fillText(checkpoint.Name, checkpoint.Position.Pos_X + 10, checkpoint.Position.Pos_Y - 10);
  });
};

// 绘制路径连接线
const drawPaths = (ctx: CanvasRenderingContext2D) => {
  ctx.strokeStyle = '#9E9E9E';
  ctx.lineWidth = 2;
  
  // 连接出入口和检查点
  [...entries.value, ...checkpoints.value].forEach(location => {
    // 绘制起始到当前位置的路径
    if (location.Start.Pos_X !== location.Position.Pos_X || 
        location.Start.Pos_Y !== location.Position.Pos_Y) {
      ctx.beginPath();
      ctx.moveTo(location.Start.Pos_X, location.Start.Pos_Y);
      ctx.lineTo(location.Position.Pos_X, location.Position.Pos_Y);
      ctx.stroke();
    }
    
    // 绘制当前位置到结束位置的路径
    if (location.End.Pos_X !== location.Position.Pos_X || 
        location.End.Pos_Y !== location.Position.Pos_Y) {
      ctx.beginPath();
      ctx.moveTo(location.Position.Pos_X, location.Position.Pos_Y);
      ctx.lineTo(location.End.Pos_X, location.End.Pos_Y);
      ctx.stroke();
    }
  });
};

// 绘制车辆
const drawVehicles = (ctx: CanvasRenderingContext2D) => {
  activeVehicles.value.forEach(vehicle => {
    // 根据车辆是否被选中设置不同颜色
    if (store.selectedVehicle === vehicle.No) {
      ctx.fillStyle = '#FF5722'; // 橙色表示选中的车辆
    } else {
      ctx.fillStyle = '#FF0000'; // 红色表示普通车辆
    }
    
    ctx.beginPath();
    ctx.arc(vehicle.Position.Pos_X, vehicle.Position.Pos_Y, 6, 0, Math.PI * 2);
    ctx.fill();
    
    // 绘制车辆编号
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(vehicle.No.substring(0, 3), vehicle.Position.Pos_X, vehicle.Position.Pos_Y);
  });
};

// 监听数据变化并重绘
watch([entries, checkpoints, activeVehicles], () => {
  nextTick(() => {
    drawMap();
  });
}, { deep: true });

// 初始化绘制
onMounted(() => {
  nextTick(() => {
    drawMap();
  });
});

// 清理
onUnmounted(() => {
  hoveredVehicle.value = null;
});
</script>

<style scoped>
.map-container {
  position: relative;
  border: 1px solid #ccc;
  background-color: #fff;
}

.tooltip {
  position: fixed;
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 8px;
  border-radius: 4px;
  font-size: 12px;
  pointer-events: none;
  z-index: 1000;
  min-width: 150px;
}

canvas {
  display: block;
}
</style>