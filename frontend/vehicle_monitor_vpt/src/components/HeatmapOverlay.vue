<template>
  <div class="heatmap-overlay" :style="{ width: width + 'px', height: height + 'px' }">
    <canvas 
      ref="canvasRef" 
      :width="width" 
      :height="height"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue';
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
const store = useTrafficStore();

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
  // 遍历所有路径并根据拥挤程度绘制不同颜色
  store.entries.forEach(entry => {
    const pathId = `${entry.Start.Pos_X}-${entry.Start.Pos_Y}-${entry.End.Pos_X}-${entry.End.Pos_Y}`;
    const congestionLevel = store.pathCongestion[pathId] || 0;
    
    // 根据拥挤等级设置颜色
    let color;
    switch(congestionLevel) {
      case 1:
        color = 'rgba(0, 255, 0, 0.3)'; // 绿色 - 一级拥挤
        break;
      case 2:
        color = 'rgba(255, 255, 0, 0.4)'; // 黄色 - 二级拥挤
        break;
      case 3:
        color = 'rgba(255, 0, 0, 0.5)'; // 红色 - 三级拥挤
        break;
      default:
        return; // 不拥挤时不绘制
    }
    
    // 绘制路径
    ctx.strokeStyle = color;
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    
    ctx.beginPath();
    ctx.moveTo(entry.Start.Pos_X, entry.Start.Pos_Y);
    ctx.lineTo(entry.End.Pos_X, entry.End.Pos_Y);
    ctx.stroke();
  });
  
  // 绘制检查点区域的拥挤程度
  store.checkpoints.forEach(checkpoint => {
    const pathId = `checkpoint-${checkpoint.No}`;
    const congestionLevel = store.pathCongestion[pathId] || 0;
    
    // 根据拥挤等级设置颜色
    let color;
    switch(congestionLevel) {
      case 1:
        color = 'rgba(0, 255, 0, 0.3)';
        break;
      case 2:
        color = 'rgba(255, 255, 0, 0.4)';
        break;
      case 3:
        color = 'rgba(255, 0, 0, 0.5)';
        break;
      default:
        return;
    }
    
    // 绘制检查点圆形区域
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(checkpoint.Position.Pos_X, checkpoint.Position.Pos_Y, 30, 0, Math.PI * 2);
    ctx.fill();
  });
};

// 监听拥堵数据变化并重新绘制
watch(() => store.pathCongestion, () => {
  nextTick(() => {
    drawHeatmap();
  });
}, { deep: true });

// 初始化绘制
onMounted(() => {
  nextTick(() => {
    drawHeatmap();
  });
});
</script>

<style scoped>
.heatmap-overlay {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none; /* 使热力图不影响底层元素的交互 */
}
</style>