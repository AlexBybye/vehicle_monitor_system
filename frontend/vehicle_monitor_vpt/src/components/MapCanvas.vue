<template>
  <div class="map-container" ref="containerRef">
    <canvas 
      ref="canvasRef" 
      :width="canvasWidth" 
      :height="canvasHeight"
      class="map-canvas"
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
  showHeatmap?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  canvasWidth: 800,
  canvasHeight: 600,
  showHeatmap: true
});

// 引用画布元素和容器
const canvasRef = ref<HTMLCanvasElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);

// 悬浮车辆信息
const hoveredVehicle = ref<VehiclePosition | null>(null);
const tooltipX = ref(0);
const tooltipY = ref(0);

// 图片资源
const entryImage = new Image();
entryImage.src = '/images/entry.png';

const checkpointImage = new Image();
checkpointImage.src = '/images/checkpoint.png';

const car1Image = new Image();
car1Image.src = '/images/car1.png';

const car2Image = new Image();
car2Image.src = '/images/car2.png';

// 图片是否加载完成
const imagesLoaded = ref(false);

// 使用交通状态
const store = useTrafficStore();
const { entries, checkpoints, vehicles, vehicleDetails } = storeToRefs(store);

// 计算属性：过滤掉已离开区域的车辆
const activeVehicles = computed(() => {
  return vehicles.value.filter(v => !(v.Position.Pos_X === 0 && v.Position.Pos_Y === 0));
});

// 将以左下角为原点的坐标转换为以左上角为原点的坐标（画布坐标）
const convertCoord = (x: number, y: number): {x: number, y: number} => {
  return { x, y: props.canvasHeight - y }; // 使用props.canvasHeight而不是固定的600
};

// 将以左下角为原点的坐标转换为以左上角为原点的坐标，并匹配期望的格式
const convertCoordWithFormat = (x: number, y: number): { Pos_X: number, Pos_Y: number } => {
  const converted = convertCoord(x, y);
  return { Pos_X: converted.x, Pos_Y: converted.y };
};

// 将线段按指定长度切分的辅助函数
const drawSegmentedLine = (ctx: CanvasRenderingContext2D, startX: number, startY: number, endX: number, endY: number, segmentLength: number = 100) => {
  const dx = endX - startX;
  const dy = endY - startY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  if (distance <= segmentLength) {
    // 如果距离小于等于段长度，则直接画一条线
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
  } else {
    // 否则按段长度切分
    const segments = Math.ceil(distance / segmentLength);
    const stepX = dx / segments;
    const stepY = dy / segments;
    
    for (let i = 0; i < segments; i++) {
      const x1 = startX + stepX * i;
      const y1 = startY + stepY * i;
      const x2 = startX + stepX * (i + 1);
      const y2 = startY + stepY * (i + 1);
      
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }
};

// 获取 canvas 实际显示的缩放和偏移
const getCanvasDisplayInfo = () => {
  if (!canvasRef.value || !containerRef.value) {
    return { scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0 };
  }

  const canvasStyle = window.getComputedStyle(canvasRef.value);
  const containerRect = containerRef.value.getBoundingClientRect();
  
  // 获取 canvas 的实际显示尺寸
  const displayWidth = parseFloat(canvasStyle.width);
  const displayHeight = parseFloat(canvasStyle.height);
  
  // 计算缩放比例
  const scaleX = displayWidth / props.canvasWidth;
  const scaleY = displayHeight / props.canvasHeight;
  
  // 计算偏移（居中显示时的偏移）
  const offsetX = (containerRect.width - displayWidth) / 2;
  const offsetY = (containerRect.height - displayHeight) / 2;
  
  return { scaleX, scaleY, offsetX, offsetY };
};

// 鼠标事件处理
const handleCanvasClick = (event: MouseEvent) => {
  if (!canvasRef.value || !containerRef.value) return;
  
  const rect = containerRef.value.getBoundingClientRect();
  const { scaleX, scaleY, offsetX, offsetY } = getCanvasDisplayInfo();
  
  // 计算相对于 canvas 逻辑坐标系的坐标
  const x = (event.clientX - rect.left - offsetX) / scaleX;
  const y = (event.clientY - rect.top - offsetY) / scaleY;
  
  // 检查是否点击了某个车辆
  const clickedVehicle = activeVehicles.value.find(vehicle => {
    // 对于图片，我们需要更大的点击半径
    const distance = Math.sqrt(
      Math.pow(vehicle.Position.Pos_X - x, 2) + 
      Math.pow(vehicle.Position.Pos_Y - y, 2)
    );
    return distance < 20; // 20像素范围内的点击视为有效点击
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
  if (!canvasRef.value || !containerRef.value) return;
  
  const rect = containerRef.value.getBoundingClientRect();
  const { scaleX, scaleY, offsetX, offsetY } = getCanvasDisplayInfo();
  
  // 计算相对于 canvas 逻辑坐标系的坐标
  const x = (event.clientX - rect.left - offsetX) / scaleX;
  const y = (event.clientY - rect.top - offsetY) / scaleY;
  
  // 查找鼠标悬停的车辆
  const vehicle = activeVehicles.value.find(v => {
    // 对于图片，我们需要更大的悬停半径
    const distance = Math.sqrt(
      Math.pow(v.Position.Pos_X - x, 2) + 
      Math.pow(v.Position.Pos_Y - y, 2)
    );
    return distance < 20; // 20像素范围内
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

// 计算车辆的角度（用于旋转）
const calculateVehicleAngle = (vehicle: VehiclePosition): number => {
  // 这里我们可以根据车辆的移动方向来计算角度
  // 如果有连续的位置数据，可以根据前后两个位置点计算方向
  // 现在暂时返回一个固定的示例角度，实际应用中可以根据轨迹计算
  
  // 根据车辆尾号判断是奇数还是偶数
  const lastDigit = parseInt(vehicle.No.slice(-1)); // 获取车牌号最后一位数字
  // 这里我们返回一个示例角度，实际应用中应根据轨迹计算
  // 假设我们有一些方法可以估算车辆方向
  return 0; // 默认角度为0
};

// 根据车辆尾号选择车辆图片
const getCarImage = (vehicleNo: string) => {
  const lastDigit = parseInt(vehicleNo.slice(-1));
  // 检查最后一位是否为数字
  if (isNaN(lastDigit)) {
    // 如果不是数字，则默认使用car1
    return car1Image;
  }
  // 如果是偶数使用car1，奇数使用car2
  return lastDigit % 2 === 0 ? car1Image : car2Image;
};

// 绘制函数
const drawMap = () => {
  if (!canvasRef.value) return;
  
  const ctx = canvasRef.value.getContext('2d');
  if (!ctx) return;
  
  // 等待图片加载完成
  if (!imagesLoaded.value) {
    // 检查所有图片是否都已加载
    if (entryImage.complete && checkpointImage.complete && car1Image.complete && car2Image.complete) {
      imagesLoaded.value = true;
    } else {
      // 如果图片还没加载完成，设置一个延迟重新绘制
      setTimeout(drawMap, 100);
      return;
    }
  }
  
  // 清空画布
  ctx.clearRect(0, 0, props.canvasWidth, props.canvasHeight);
  
  // 绘制道路网络背景
  drawRoadNetwork(ctx);
  
  // 绘制路径拥挤程度热力图（如果启用）
  if (props.showHeatmap) {
    drawPathCongestion(ctx);
  }
  
  // 绘制出入口
  drawEntries(ctx);
  
  // 绘制检查点
  drawCheckpoints(ctx);
  
  // 绘制路径连接线
  drawPaths(ctx);
  
  // 绘制车辆
  drawVehicles(ctx);
};

// 绘制道路网络背景
  const drawRoadNetwork = (ctx: CanvasRenderingContext2D) => {
    // 设置道路样式
    ctx.strokeStyle = '#aaaaaa';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    
    // 根据您提供的详细连接规则绘制道路网络，使用左下角为(0,0)的坐标系
    // 先将逻辑坐标转换为画布坐标（左上角为(0,0)）
    
    // 1. (0, 400) 与 (200, 400) 双向连接
    const p1 = convertCoord(0, 400);
    const p2 = convertCoord(200, 400);
    drawSegmentedLine(ctx, p1.x, p1.y, p2.x, p2.y);
    
    // 2. 从(300,500)先到(200,500)再到(200,400) - 您指定的新路径
    const p3 = convertCoord(300, 500);  // (300, 500) -> (300, 100)
    const p4 = convertCoord(200, 500);  // (200, 500) -> (200, 100)
    const p5 = convertCoord(200, 400);  // (200, 400) -> (200, 200)
    
    // 从(300,500)到(200,500)
    drawSegmentedLine(ctx, p3.x, p3.y, p4.x, p4.y);
    
    // 从(200,500)到(200,400)
    drawSegmentedLine(ctx, p4.x, p4.y, p5.x, p5.y);
    
    // 3. (200, 400) 与 (200, 300) 单向连接（箭头由 (200, 400) 指向 (200, 300)）
    const p6 = convertCoord(200, 300);
    drawSegmentedLine(ctx, p5.x, p5.y, p6.x, p6.y);  // p5是(200, 400)
    
    // 4. (200, 300) 与 (200, 100) 单向连接（箭头由 (200, 300) 指向 (200, 100)）
    const p7 = convertCoord(200, 100);
    drawSegmentedLine(ctx, p6.x, p6.y, p7.x, p7.y);
    
    // 5. (200, 0) 与 (200, 100) 单向连接（箭头由 (200, 0) 指向 (200, 100)）
    const p8 = convertCoord(200, 0);
    drawSegmentedLine(ctx, p8.x, p8.y, p7.x, p7.y);
    
    // 6. (200, 100) 与 (300, 100) 单向连接（箭头由 (200, 100) 指向 (300, 100)）
    const p9 = convertCoord(300, 100);
    drawSegmentedLine(ctx, p7.x, p7.y, p9.x, p9.y);
    
    // 7. (300, 100) 与 (400, 100) 单向连接（箭头由 (300, 100) 指向 (400, 100)）
    const p10 = convertCoord(400, 100);
    drawSegmentedLine(ctx, p9.x, p9.y, p10.x, p10.y);
    
    // 8. (400, 100) 与 (600, 100) 单向连接（箭头由 (400, 100) 指向 (600, 100)）
    // 按照您的要求，将(400,100)-(600,100)分成(400,100)-(500,100)和(500,100)-(600,100)
    const p10_500 = convertCoord(500, 100);
    const p11 = convertCoord(600, 100);
    drawSegmentedLine(ctx, p10.x, p10.y, p10_500.x, p10_500.y);
    drawSegmentedLine(ctx, p10_500.x, p10_500.y, p11.x, p11.y);
    
    // 9. (600, 100) 与 (600, 200) 单向连接（箭头由 (600, 100) 指向 (600, 200)）
    const p12 = convertCoord(600, 200);
    drawSegmentedLine(ctx, p11.x, p11.y, p12.x, p12.y);
    
    // 10. (800, 200) 与 (600, 200) 单向连接（箭头由 (800, 200) 指向 (600, 200)）
    const p13 = convertCoord(800, 200);
    drawSegmentedLine(ctx, p13.x, p13.y, p12.x, p12.y);
    
    // 11. (600, 200) 与 (600, 300) 单向连接（箭头由 (600, 200) 指向 (600, 300)）
    const p14 = convertCoord(600, 300);
    drawSegmentedLine(ctx, p12.x, p12.y, p14.x, p14.y);
    
    // 12. (600, 300) 与 (600, 500) 单向连接（箭头由 (600, 300) 指向 (600, 500)）
    const p15 = convertCoord(600, 500);
    drawSegmentedLine(ctx, p14.x, p14.y, p15.x, p15.y);
    
    // 13. (600, 500) 与 (500, 500) 单向连接（箭头由 (600, 500) 指向 (500, 500)）
    const p16 = convertCoord(500, 500);
    drawSegmentedLine(ctx, p15.x, p15.y, p16.x, p16.y);
    
    // 14. (500, 500) 与 (400, 500) 单向连接（箭头由 (500, 500) 指向 (400, 500)）
    const p17 = convertCoord(400, 500);
    drawSegmentedLine(ctx, p16.x, p16.y, p17.x, p17.y);
    
    // 15. (400, 600) 与 (400, 500) 单向连接（箭头由 (400, 600) 指向 (400, 500)）
    const p18 = convertCoord(400, 600);
    drawSegmentedLine(ctx, p18.x, p18.y, p17.x, p17.y);
    
    // 16. (400, 500) 与 (300, 500) 单向连接（箭头由 (400, 500) 指向 (300, 500)）
    drawSegmentedLine(ctx, p17.x, p17.y, p3.x, p3.y);  // p3是(300, 500)
  };

// 绘制出入口
const drawEntries = (ctx: CanvasRenderingContext2D) => {
  entries.value.forEach(entry => {
    // 转换坐标
    const posConverted = convertCoord(entry.Position.Pos_X, entry.Position.Pos_Y);
    
    // 绘制出入口图片
    try {
      ctx.drawImage(entryImage, posConverted.x - 12, posConverted.y - 12, 24, 24);
    } catch (e) {
      // 如果图片未加载完成，使用简单的圆形作为备选
      ctx.fillStyle = '#4CAF50';
      ctx.beginPath();
      ctx.arc(posConverted.x, posConverted.y, 8, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // 绘制出入口名称
    ctx.fillStyle = '#000';
    ctx.font = '12px Arial';
    ctx.fillText(entry.Name, posConverted.x + 15, posConverted.y - 15);
  });
};

// 绘制检查点
const drawCheckpoints = (ctx: CanvasRenderingContext2D) => {
  checkpoints.value.forEach(checkpoint => {
    // 转换坐标
    const posConverted = convertCoord(checkpoint.Position.Pos_X, checkpoint.Position.Pos_Y);
    
    // 绘制检查点图片，扩大1.25倍
    try {
      ctx.drawImage(checkpointImage, posConverted.x - 12.5, posConverted.y - 12.5, 25, 25);
    } catch (e) {
      // 如果图片未加载完成，使用简单的圆形作为备选
      ctx.fillStyle = '#2196F3';
      ctx.beginPath();
      ctx.arc(posConverted.x, posConverted.y, 7.5, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // 绘制检查点名称
    ctx.fillStyle = '#000';
    ctx.font = '12px Arial';
    ctx.fillText(checkpoint.Name, posConverted.x + 15, posConverted.y - 15);
  });
};

// 绘制路径拥挤程度热力图
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
        color = 'rgba(0, 255, 0, 0.4)'; // 绿色 - 一级拥挤
        break;
      case 2:
        color = 'rgba(255, 255, 0, 0.4)'; // 黄色 - 二级拥挤
        break;
      case 3:
        color = 'rgba(255, 0, 0, 0.4)'; // 红色 - 三级拥挤
        break;
      default:
        color = 'rgba(0, 0, 0, 0)'; // 不应该到达这里
    }
    
    // 检查是否为路径类型 (格式: path:startId->endId)
    if (pathId.startsWith('path:')) {
      // 直接使用存储的路径段坐标，并进行坐标转换
      const startPos = pathSegment.start;
      const endPos = pathSegment.end;
      
      if (startPos && endPos) {
        // 进行坐标转换（将左下角为原点转换为左上角为原点）
        const startConverted = convertCoord(startPos.Pos_X, startPos.Pos_Y);
        const endConverted = convertCoord(endPos.Pos_X, endPos.Pos_Y);
        
        // 绘制路径
        // 先绘制一个更细的基础线，再绘制主要的热力图线，增加视觉效果
        ctx.strokeStyle = 'rgba(100, 100, 100, 0.2)'; // 淡灰色底层
        ctx.lineWidth = 16;
        ctx.lineCap = 'round';
        
        ctx.beginPath();
        ctx.moveTo(startConverted.x, startConverted.y);
        ctx.lineTo(endConverted.x, endConverted.y);
        ctx.stroke();
        
        // 主要的热力图线
        ctx.strokeStyle = color;
        ctx.lineWidth = 12; // 增加线宽使路径更明显
        ctx.lineCap = 'round';
        
        ctx.beginPath();
        ctx.moveTo(startConverted.x, startConverted.y);
        ctx.lineTo(endConverted.x, endConverted.y);
        ctx.stroke();
      }
    } 
    // 检查是否为检查点类型 (格式: checkpoint-{checkpointNo})
    else if (pathId.startsWith('checkpoint-')) {
      const checkpointNo = pathId.replace('checkpoint-', '');
      const checkpoint = checkpoints.value.find(c => c.No === checkpointNo);
      
      if (checkpoint) {
        // 进行坐标转换
        const posConverted = convertCoord(checkpoint.Position.Pos_X, checkpoint.Position.Pos_Y);
        
        // 绘制检查点圆形区域
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(posConverted.x, posConverted.y, 30, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
};

// 绘制路径连接线
const drawPaths = (ctx: CanvasRenderingContext2D) => {
  ctx.strokeStyle = '#9E9E9E';
  ctx.lineWidth = 2;
  
  // 连接出入口和检查点
  [...entries.value, ...checkpoints.value].forEach(location => {
    // 转换坐标
    const startConverted = convertCoord(location.Start.Pos_X, location.Start.Pos_Y);
    const posConverted = convertCoord(location.Position.Pos_X, location.Position.Pos_Y);
    const endConverted = convertCoord(location.End.Pos_X, location.End.Pos_Y);
    
    // 绘制起始到当前位置的路径
    if (location.Start.Pos_X !== location.Position.Pos_X || 
        location.Start.Pos_Y !== location.Position.Pos_Y) {
      ctx.beginPath();
      ctx.moveTo(startConverted.x, startConverted.y);
      ctx.lineTo(posConverted.x, posConverted.y);
      ctx.stroke();
    }
    
    // 绘制当前位置到结束位置的路径
    if (location.End.Pos_X !== location.Position.Pos_X || 
        location.End.Pos_Y !== location.Position.Pos_Y) {
      ctx.beginPath();
      ctx.moveTo(posConverted.x, posConverted.y);
      ctx.lineTo(endConverted.x, endConverted.y);
      ctx.stroke();
    }
  });
};

// 绘制车辆
const drawVehicles = (ctx: CanvasRenderingContext2D) => {
  activeVehicles.value.forEach(vehicle => {
    // 根据车辆尾号选择对应的车辆图片
    const carImg = getCarImage(vehicle.No);
    
    // 计算车辆的方向角度
    const angle = calculateVehicleAngle(vehicle);
    
    // 转换车辆坐标
    const vehicleConverted = convertCoord(vehicle.Position.Pos_X, vehicle.Position.Pos_Y);
    
    // 保存当前上下文状态
    ctx.save();
    
    // 移动到车辆位置
    ctx.translate(vehicleConverted.x, vehicleConverted.y);
    
    // 旋转到指定角度
    ctx.rotate(angle);
    
    // 根据是否选中设置透明度
    if (store.selectedVehicle === vehicle.No) {
      ctx.globalAlpha = 0.8; // 选中时稍微透明
    } else {
      ctx.globalAlpha = 1.0; // 正常透明度
    }
    
    try {
      // 绘制车辆图片，旋转后图片右侧朝向前进方向
      // 图片大小为 16x16，改善比例
      ctx.drawImage(carImg, -16, -16, 32, 32);
    } catch (e) {
      // 如果图片未加载完成，使用简单的圆形作为备选
      if (store.selectedVehicle === vehicle.No) {
        ctx.fillStyle = '#FF5722'; // 橙色表示选中的车辆
      } else {
        ctx.fillStyle = '#FF0000'; // 红色表示普通车辆
      }
      
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // 恢复上下文状态
    ctx.restore();
    
    // 绘制车辆编号（在原始位置，不随车辆旋转）
    ctx.fillStyle = '#000';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(vehicle.No.substring(vehicle.No.length - 3), vehicleConverted.x, vehicleConverted.y + 20);
  });
};

// 监听数据变化并重绘
watch([entries, checkpoints, activeVehicles, () => store.pathCongestion, () => props.showHeatmap], () => {
  nextTick(() => {
    drawMap();
  });
}, { deep: true });

// 处理窗口大小变化
const handleResize = () => {
  if (containerRef.value) {
    // 这里我们不需要改变 canvas 的逻辑尺寸，只改变显示尺寸
    // 因为坐标系统是基于逻辑尺寸的
    nextTick(() => {
      drawMap();
    });
  }
};

// 初始化绘制
onMounted(() => {
  // 等待图片加载完成后再绘制
  const checkImages = () => {
    if (entryImage.complete && checkpointImage.complete && car1Image.complete && car2Image.complete) {
      imagesLoaded.value = true;
      nextTick(() => {
        drawMap();
      });
    } else {
      setTimeout(checkImages, 50);
    }
  };
  
  // 监听窗口大小变化
  window.addEventListener('resize', handleResize);
  
  checkImages();
});

// 清理
onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  hoveredVehicle.value = null;
});
</script>

<style scoped>
.map-container {
  position: relative;
  border: 1px solid #ccc;
  background-color: #fff;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.map-canvas {
  display: block;
  width: 100%;
  height: 100%;
  /* 固定canvas的实际尺寸 */
  image-rendering: -webkit-optimize-contrast;
  image-rendering: crisp-edges;
  image-rendering: pixelated;
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
</style>