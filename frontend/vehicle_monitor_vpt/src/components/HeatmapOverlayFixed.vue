<template>
  <div class="heatmap-overlay" ref="overlayContainerRef" :style="{ width: width + 'px', height: height + 'px' }">
    <canvas 
      ref="canvasRef" 
      :width="width" 
      :height="height"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted,onUnmounted, watch, nextTick } from 'vue';
import { useTrafficStore } from '@/store/trafficStore';
import type { Entry, Checkpoint } from '@/types';

interface Props {
  width?: number;
  height?: number;
}

const props = withDefaults(defineProps<Props>(), {
  width: 800,
  height: 600
});

const canvasRef = ref<HTMLCanvasElement | null>(null);
const overlayContainerRef = ref<HTMLDivElement | null>(null);
const store = useTrafficStore();

// 获取热力图实际显示的缩放和偏移
const getOverlayDisplayInfo = () => {
  if (!canvasRef.value || !overlayContainerRef.value) {
    return { scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0 };
  }

  const canvasStyle = window.getComputedStyle(canvasRef.value);
  const containerRect = overlayContainerRef.value.getBoundingClientRect();
  
  // 获取 canvas 的实际显示尺寸
  const displayWidth = parseFloat(canvasStyle.width);
  const displayHeight = parseFloat(canvasStyle.height);
  
  // 计算缩放比例
  const scaleX = displayWidth / props.width;
  const scaleY = displayHeight / props.height;
  
  // 计算偏移（居中显示时的偏移）
  const offsetX = (containerRect.width - displayWidth) / 2;
  const offsetY = (containerRect.height - displayHeight) / 2;
  
  return { scaleX, scaleY, offsetX, offsetY };
};

// 绘制热力图
const drawHeatmap = () => {
  if (!canvasRef.value) return;
  
  const ctx = canvasRef.value.getContext('2d');
  if (!ctx) return;
  
  // 清空画布
  ctx.clearRect(0, 0, props.width, props.height);
  
  // 绘制路径拥挤程度热力图
  drawPathCongestion(ctx);
};

// 绘制路径拥挤程度
const drawPathCongestion = (ctx: CanvasRenderingContext2D) => {
  // 绘制所有路径的拥挤程度
  // 遍历拥堵数据，只绘制有拥堵的路径
  for (const [pathId, pathSegment] of Object.entries(store.pathCongestion)) {
    const congestionLevel = pathSegment.congestionLevel;
    if (congestionLevel <= 0) continue;
    
    // 根据拥挤等级设置颜色
    let color;
    switch(congestionLevel) {
      case 1:
        color = 'rgba(0, 255, 0, 0.5)'; // 绿色 - 一级拥挤
        break;
      case 2:
        color = 'rgba(255, 255, 0, 0.5)'; // 黄色 - 二级拥挤
        break;
      case 3:
        color = 'rgba(255, 0, 0, 0.5)'; // 红色 - 三级拥挤
        break;
      default:
        color = 'rgba(0, 0, 0, 0)'; // 不应该到达这里
    }
    
    // 检查是否为路径类型 (格式: path:startId->endId)
    if (pathId.startsWith('path:')) {
      // 直接使用存储的路径段坐标，不需要解析路径ID
      const startPos = pathSegment.start;
      const endPos = pathSegment.end;
      
      if (startPos && endPos) {
        // 进行坐标转换（将左下角为原点转换为左上角为原点）
        const startConverted = convertCoordWithFormat(startPos.Pos_X, startPos.Pos_Y);
        const endConverted = convertCoordWithFormat(endPos.Pos_X, endPos.Pos_Y);
        
        // 绘制路径段
        ctx.strokeStyle = color;
        ctx.lineWidth = 14;
        ctx.lineCap = 'round';
        
        ctx.beginPath();
        ctx.moveTo(startConverted.Pos_X, startConverted.Pos_Y);
        ctx.lineTo(endConverted.Pos_X, endConverted.Pos_Y);
        ctx.stroke();
      }
    } 
    // 检查是否为检查点类型 (格式: checkpoint-{checkpointNo})
    else if (pathId.startsWith('checkpoint-')) {
      const checkpointNo = pathId.replace('checkpoint-', '');
      const checkpoint = store.checkpoints.find(c => c.No === checkpointNo);
      
      if (checkpoint) {
        // 进行坐标转换
        const posConverted = convertCoordWithFormat(checkpoint.Position.Pos_X, checkpoint.Position.Pos_Y);
        
        // 绘制检查点圆形区域
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(posConverted.Pos_X, posConverted.Pos_Y, 35, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
};

// 将以左下角为原点的坐标转换为以左上角为原点的坐标，并匹配期望的格式
const convertCoordWithFormat = (x: number, y: number): { Pos_X: number, Pos_Y: number } => {
  return { Pos_X: x, Pos_Y: props.height - y }; // 使用props.height而不是固定的600
};

// 监听拥堵数据变化并重新绘制
watch(() => store.pathCongestion, () => {
  nextTick(() => {
    drawHeatmap();
  });
}, { deep: true });

// 处理窗口大小变化
const handleResize = () => {
  if (overlayContainerRef.value) {
    nextTick(() => {
      drawHeatmap();
    });
  }
};

// 初始化绘制
onMounted(() => {
  // 监听窗口大小变化
  window.addEventListener('resize', handleResize);
  
  nextTick(() => {
    drawHeatmap();
  });
});

// 清理
onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});
</script>

<style scoped>
.heatmap-overlay {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none; /* 使热力图不影响底层元素的交互 */
  width: 100%;
  height: 100%;
  image-rendering: -webkit-optimize-contrast;
  image-rendering: crisp-edges;
  image-rendering: pixelated;
}
</style>