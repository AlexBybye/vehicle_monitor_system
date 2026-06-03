<template>
  <div
    class="map-container"
    ref="containerRef"
    @wheel.prevent="handleWheel"
    @mousedown="handleMouseDown"
    @mousemove="handleMouseMove"
    @mouseup="handleMouseUp"
    @mouseleave="handleMouseUp"
  >
    <!-- 静态层：道路网络 / 出入口 / 检查点（仅在数据或视图变换变化时重绘） -->
    <canvas
      ref="staticCanvasRef"
      :width="canvasWidth"
      :height="canvasHeight"
      class="map-canvas static-layer"
    />
    <!-- 动态层：拥堵热力图 / 车辆轨迹 / 车辆（requestAnimationFrame 逐帧重绘 + 插值） -->
    <canvas
      ref="dynamicCanvasRef"
      :width="canvasWidth"
      :height="canvasHeight"
      class="map-canvas dynamic-layer"
      :class="{ panning: isPanning }"
      @click="handleCanvasClick"
    />

    <!-- 缩放控制 -->
    <div class="map-zoom-controls">
      <button class="zoom-btn" @click="zoomByButton(1.2)" title="放大">＋</button>
      <button class="zoom-btn" @click="zoomByButton(1 / 1.2)" title="缩小">－</button>
      <button class="zoom-btn" @click="resetView" title="复位">⟲</button>
    </div>

    <!-- 选中车辆信息面板 -->
    <div v-if="selectedVehicleInfo" class="vehicle-info-panel">
      <h3>车辆详细信息</h3>
      <div class="info-item">
        <span class="label">车牌号:</span>
        <span class="value">{{ selectedVehicleInfo.No }}</span>
      </div>
      <div class="info-item">
        <span class="label">位置:</span>
        <span class="value">({{ selectedVehicleInfo.Position.Pos_X }}, {{ selectedVehicleInfo.Position.Pos_Y }})</span>
      </div>
      <div class="info-item" v-if="vehicleDetails && vehicleDetails[selectedVehicleInfo.No]">
        <span class="label">瞬时车速:</span>
        <span class="value">{{ vehicleDetails[selectedVehicleInfo.No]?.Speed }} km/h</span>
      </div>
      <div class="info-item" v-if="vehicleDetails && vehicleDetails[selectedVehicleInfo.No] && vehicleDetails[selectedVehicleInfo.No]?.EnterTime">
        <span class="label">进入时间:</span>
        <span class="value">{{ vehicleDetails[selectedVehicleInfo.No]?.EnterTime ? formatDate(vehicleDetails[selectedVehicleInfo.No]?.EnterTime!) : 'N/A' }}</span>
      </div>
      <div class="info-item" v-if="vehicleDetails && vehicleDetails[selectedVehicleInfo.No]">
        <span class="label">入口:</span>
        <span class="value">{{ vehicleDetails[selectedVehicleInfo.No]?.EnterName }} ({{ vehicleDetails[selectedVehicleInfo.No]?.EnterNo }})</span>
      </div>

      <button class="close-btn" @click="closeVehicleInfo">×</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useTrafficStore } from '@/store/trafficStore';
import { formatDate, interpolatePosition } from '@/utils';
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
const staticCanvasRef = ref<HTMLCanvasElement | null>(null);
const dynamicCanvasRef = ref<HTMLCanvasElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);

// 视图变换：缩放 + 平移（逻辑坐标 → 显示坐标）。所有绘制在应用该变换后的上下文中进行。
const viewScale = ref(1);
const viewOffset = ref({ x: 0, y: 0 });
const isPanning = ref(false);
let panStart = { x: 0, y: 0 };
let panOrigin = { x: 0, y: 0 };
let didPan = false;

// 车辆插值状态：在两次轮询（约 1s）之间用 requestAnimationFrame 平滑过渡
// renderPositions 为"当前帧实际绘制位置"，会从上一位置线性插值到最新目标位置
const renderPositions = new Map<string, { Pos_X: number; Pos_Y: number }>();
const fromPositions = new Map<string, { Pos_X: number; Pos_Y: number }>();
const targetPositions = new Map<string, { Pos_X: number; Pos_Y: number }>();
let tweenStart = 0;
const TWEEN_MS = 1000; // 与 MapView 轮询间隔一致
let rafId: number | null = null;



// 选中车辆信息（结合位置信息和详细信息）
const selectedVehicleInfo = computed(() => {
  if (store.selectedVehicle) {
    const basicInfo = vehicles.value.find(v => v.No === store.selectedVehicle);
    const detailedInfo = vehicleDetails.value[store.selectedVehicle];
    
    console.log('Basic info:', basicInfo);
    console.log('Detailed info:', detailedInfo);
    console.log('Vehicle details object:', vehicleDetails.value);
    
    // 无论是否有详细信息，我们都返回基础信息，并添加详细信息（如果有）
    if (basicInfo && detailedInfo) {
      // 合并基础信息和详细信息，详细信息覆盖基础信息中的相同字段
      return {
        ...basicInfo,
        ...detailedInfo
      };
    } else if (basicInfo) {
      // 只有基础信息
      return basicInfo;
    } else if (detailedInfo) {
      // 只有详细信息
      return detailedInfo;
    }
  }
  return null;
});

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
  if (!dynamicCanvasRef.value || !containerRef.value) {
    return { scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0 };
  }

  const canvasStyle = window.getComputedStyle(dynamicCanvasRef.value);
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

// 屏幕坐标 → canvas 逻辑坐标（先消除 CSS 适配缩放，再消除视图缩放/平移）
const screenToLogical = (clientX: number, clientY: number) => {
  const rect = containerRef.value!.getBoundingClientRect();
  const { scaleX, scaleY, offsetX, offsetY } = getCanvasDisplayInfo();
  // 1) 还原到 canvas 内部像素坐标
  const cx = (clientX - rect.left - offsetX) / scaleX;
  const cy = (clientY - rect.top - offsetY) / scaleY;
  // 2) 还原视图变换（缩放 + 平移）
  return {
    x: (cx - viewOffset.value.x) / viewScale.value,
    y: (cy - viewOffset.value.y) / viewScale.value,
  };
};

// 鼠标事件处理
const handleCanvasClick = (event: MouseEvent) => {
  if (!dynamicCanvasRef.value || !containerRef.value) return;
  // 刚刚发生过拖拽则不触发选择
  if (didPan) { didPan = false; return; }

  // 计算相对于 canvas 逻辑坐标系的坐标（含视图变换）
  const { x, y } = screenToLogical(event.clientX, event.clientY);

  // 检查是否点击了某个车辆
  // 使用更精确的检测方法，考虑车辆在画布上的实际渲染大小
  const clickedVehicle = activeVehicles.value.find(vehicle => {
    // 转换车辆坐标到画布坐标系
    const vehicleConverted = convertCoord(vehicle.Position.Pos_X, vehicle.Position.Pos_Y);

    // 计算鼠标点击点与车辆中心的距离
    const distance = Math.sqrt(
      Math.pow(vehicleConverted.x - x, 2) +
      Math.pow(vehicleConverted.y - y, 2)
    );

    // 命中半径随缩放调整：放大后图标显得更大，命中范围相应缩小（逻辑坐标）
    return distance < 40 / viewScale.value;
  });

  if (clickedVehicle) {
    store.selectVehicle(clickedVehicle.No);
    // 可以在这里触发车辆详情面板的显示
    console.log('Selected vehicle:', clickedVehicle.No);
  } else {
    store.clearSelection();
  }
};

// ===== 缩放 / 平移交互 =====
const MIN_SCALE = 0.5;
const MAX_SCALE = 5;

const clampOffset = () => {
  // 限制平移范围，避免把地图拖出可视区太远
  const w = props.canvasWidth, h = props.canvasHeight;
  const maxX = w * (viewScale.value - 1);
  const maxY = h * (viewScale.value - 1);
  viewOffset.value.x = Math.min(0, Math.max(-maxX, viewOffset.value.x));
  viewOffset.value.y = Math.min(0, Math.max(-maxY, viewOffset.value.y));
};

// 以某个逻辑画布点为锚点缩放（滚轮：锚点为鼠标位置）
const zoomAt = (canvasX: number, canvasY: number, factor: number) => {
  const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, viewScale.value * factor));
  if (newScale === viewScale.value) return;
  // 保持锚点在缩放前后对应同一逻辑位置
  const logicalX = (canvasX - viewOffset.value.x) / viewScale.value;
  const logicalY = (canvasY - viewOffset.value.y) / viewScale.value;
  viewOffset.value.x = canvasX - logicalX * newScale;
  viewOffset.value.y = canvasY - logicalY * newScale;
  viewScale.value = newScale;
  clampOffset();
  drawStatic();
};

const handleWheel = (event: WheelEvent) => {
  if (!containerRef.value) return;
  const rect = containerRef.value.getBoundingClientRect();
  const { scaleX, scaleY, offsetX, offsetY } = getCanvasDisplayInfo();
  const canvasX = (event.clientX - rect.left - offsetX) / scaleX;
  const canvasY = (event.clientY - rect.top - offsetY) / scaleY;
  zoomAt(canvasX, canvasY, event.deltaY < 0 ? 1.1 : 1 / 1.1);
};

// 按钮缩放：以画布中心为锚点
const zoomByButton = (factor: number) => {
  zoomAt(props.canvasWidth / 2, props.canvasHeight / 2, factor);
};

const resetView = () => {
  viewScale.value = 1;
  viewOffset.value = { x: 0, y: 0 };
  drawStatic();
};

const handleMouseDown = (event: MouseEvent) => {
  isPanning.value = true;
  didPan = false;
  panStart = { x: event.clientX, y: event.clientY };
  panOrigin = { ...viewOffset.value };
};

const handleMouseMove = (event: MouseEvent) => {
  if (!isPanning.value) return;
  const { scaleX } = getCanvasDisplayInfo();
  const dx = (event.clientX - panStart.x) / scaleX;
  const dy = (event.clientY - panStart.y) / scaleX;
  if (Math.abs(event.clientX - panStart.x) > 3 || Math.abs(event.clientY - panStart.y) > 3) {
    didPan = true;
  }
  viewOffset.value = { x: panOrigin.x + dx, y: panOrigin.y + dy };
  clampOffset();
  drawStatic();
};

const handleMouseUp = () => {
  isPanning.value = false;
};

// 关闭车辆信息面板
const closeVehicleInfo = () => {
  store.clearSelection();
};

// 当前选中车辆的定时更新ID
const vehicleDetailUpdateInterval = ref<number | null>(null);

// 监听选中车辆变化，获取详细信息
// 注意：地图点击只负责"显示车辆详细信息"，不再附带显示历史路线；
// 历史路线由 HistoryView 的"📍 轨迹"按钮单独控制。
watch(() => store.selectedVehicle, async (newVal) => {
  // 清除之前的选择的车辆的定时更新
  if (vehicleDetailUpdateInterval.value) {
    clearInterval(vehicleDetailUpdateInterval.value);
    vehicleDetailUpdateInterval.value = null;
  }

  if (newVal) {
    try {
      const detail = await store.fetchVehicleDetail(newVal);
      console.log('Fetch result:', detail);

      // 后续仅每秒刷新 detail 与位置；不再触发路径计算
      vehicleDetailUpdateInterval.value = setInterval(async () => {
        if (!store.selectedVehicle) {
          if (vehicleDetailUpdateInterval.value) {
            clearInterval(vehicleDetailUpdateInterval.value);
            vehicleDetailUpdateInterval.value = null;
          }
          return;
        }
        try {
          const updatedDetail = await store.fetchVehicleDetail(store.selectedVehicle);
          if (updatedDetail && updatedDetail.Position &&
              updatedDetail.Position.Pos_X === 0 && updatedDetail.Position.Pos_Y === 0) {
            store.clearSelection();
          }
        } catch (error) {
          console.error('Error updating vehicle detail:', error);
        }
      }, 1000);
    } catch (error) {
      console.error('Error fetching vehicle detail:', error);
    }
  } else {
    // 取消选择车辆：仅停止详情计时器；不再清空路径，路径由 HistoryView 独立管理
    if (vehicleDetailUpdateInterval.value) {
      clearInterval(vehicleDetailUpdateInterval.value);
      vehicleDetailUpdateInterval.value = null;
    }
  }
});

// 组件卸载时清除定时器
onUnmounted(() => {
  if (vehicleDetailUpdateInterval.value) {
    clearInterval(vehicleDetailUpdateInterval.value);
    vehicleDetailUpdateInterval.value = null;
  }
  window.removeEventListener('resize', handleResize);
});





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

// 应用当前视图变换（平移 + 缩放）到上下文。绘制结束后调用 ctx.restore() 还原。
const applyViewTransform = (ctx: CanvasRenderingContext2D) => {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, props.canvasWidth, props.canvasHeight);
  ctx.translate(viewOffset.value.x, viewOffset.value.y);
  ctx.scale(viewScale.value, viewScale.value);
};

// 确认四张图片已加载；未就绪时延迟重绘
const ensureImagesLoaded = (retry: () => void): boolean => {
  if (imagesLoaded.value) return true;
  if (entryImage.complete && checkpointImage.complete && car1Image.complete && car2Image.complete) {
    imagesLoaded.value = true;
    return true;
  }
  setTimeout(retry, 100);
  return false;
};

// 静态层绘制：道路网络 / 出入口 / 检查点（数据或视图变换变化时调用，不参与逐帧动画）
const drawStatic = () => {
  if (!staticCanvasRef.value) return;
  const ctx = staticCanvasRef.value.getContext('2d');
  if (!ctx) return;
  if (!ensureImagesLoaded(drawStatic)) return;

  applyViewTransform(ctx);
  drawRoadNetwork(ctx);
  drawEntries(ctx);
  drawCheckpoints(ctx);
  ctx.restore();
};

// 动态层绘制：拥堵热力图 / 车辆轨迹 / 车辆（由 requestAnimationFrame 每帧调用）
const drawDynamic = () => {
  if (!dynamicCanvasRef.value) return;
  const ctx = dynamicCanvasRef.value.getContext('2d');
  if (!ctx) return;
  if (!ensureImagesLoaded(drawDynamic)) return;

  applyViewTransform(ctx);
  if (props.showHeatmap) {
    drawPathCongestion(ctx);
  }
  drawVehiclePath(ctx);
  drawVehicles(ctx);
  ctx.restore();
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

// 绘制路径连接线 - 已禁用，因为道路网络已在drawRoadNetwork中精确定义
// const drawPaths = (ctx: CanvasRenderingContext2D) => {
//   ctx.strokeStyle = '#9E9E9E';
//   ctx.lineWidth = 2;
//   
//   // 连接出入口和检查点
//   [...entries.value, ...checkpoints.value].forEach(location => {
//     // 转换坐标
//     const startConverted = convertCoord(location.Start.Pos_X, location.Start.Pos_Y);
//     const posConverted = convertCoord(location.Position.Pos_X, location.Position.Pos_Y);
//     const endConverted = convertCoord(location.End.Pos_X, location.End.Pos_Y);
//     
//     // 绘制起始到当前位置的路径
//     if (location.Start.Pos_X !== location.Position.Pos_X || 
//         location.Start.Pos_Y !== location.Position.Pos_Y) {
//       ctx.beginPath();
//       ctx.moveTo(startConverted.x, startConverted.y);
//       ctx.lineTo(posConverted.x, posConverted.y);
//       ctx.stroke();
//     }
//     
//     // 绘制当前位置到结束位置的路径
//     if (location.End.Pos_X !== location.Position.Pos_X || 
//         location.End.Pos_Y !== location.Position.Pos_Y) {
//       ctx.beginPath();
//       ctx.moveTo(posConverted.x, posConverted.y);
//       ctx.lineTo(endConverted.x, endConverted.y);
//       ctx.stroke();
//     }
//   });
// };

// 绘制车辆路径
const drawVehiclePath = (ctx: CanvasRenderingContext2D) => {
  const pathData = store.vehiclePathToDisplay;
  if (!pathData || pathData.length === 0) return;

  // 设置路径样式
  ctx.strokeStyle = '#FF4136'; // 红色路径 (更鲜艳的颜色)
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(255, 65, 54, 0.5)';
  ctx.shadowBlur = 10;
  
  // 开始绘制路径
  ctx.beginPath();
  
  // 遍历路径点并绘制线条
  for (let i = 0; i < pathData.length; i++) {
    const point = pathData[i];
    const convertedPos = convertCoord(point.position.Pos_X, point.position.Pos_Y);
    
    if (i === 0) {
      // 移动到第一个点
      ctx.moveTo(convertedPos.x, convertedPos.y);
    } else {
      // 连接到下一个点
      ctx.lineTo(convertedPos.x, convertedPos.y);
    }
  }
  
  // 绘制路径
  ctx.stroke();
  
  // 清除阴影效果
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  
  // 绘制轨迹点（更密集的点）
  for (let i = 0; i < pathData.length; i += Math.max(1, Math.floor(pathData.length / 20))) { // 每20个点绘制一个轨迹点
    const point = pathData[i];
    const convertedPos = convertCoord(point.position.Pos_X, point.position.Pos_Y);
    
    // 绘制轨迹点
    ctx.fillStyle = '#0074D9'; // 蓝色轨迹点
    ctx.beginPath();
    ctx.arc(convertedPos.x, convertedPos.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // 绘制起点和终点标记
  if (pathData.length > 0) {
    // 起点（绿色圆圈）
    const startPoint = pathData[0];
    const startConverted = convertCoord(startPoint.position.Pos_X, startPoint.position.Pos_Y);
    ctx.fillStyle = '#2ECC40'; // 绿色
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(startConverted.x, startConverted.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // 终点（红色圆圈）
    const endPoint = pathData[pathData.length - 1];
    const endConverted = convertCoord(endPoint.position.Pos_X, endPoint.position.Pos_Y);
    ctx.fillStyle = '#FF4136'; // 红色
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(endConverted.x, endConverted.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // 添加起点和终点的文字标识
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('起点', startConverted.x, startConverted.y - 15);
    ctx.fillText('终点', endConverted.x, endConverted.y - 15);
  }
};

// 绘制车辆
const drawVehicles = (ctx: CanvasRenderingContext2D) => {
  activeVehicles.value.forEach(vehicle => {
    // 根据车辆尾号选择对应的车辆图片
    const carImg = getCarImage(vehicle.No);

    // 计算车辆的方向角度
    const angle = calculateVehicleAngle(vehicle);

    // 使用插值后的渲染位置（两次轮询间平滑过渡），未就绪则回退到真实位置
    const renderPos = renderPositions.get(vehicle.No) ?? vehicle.Position;
    const vehicleConverted = convertCoord(renderPos.Pos_X, renderPos.Pos_Y);
    
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

// 静态层只在出入口/检查点数据变化时重绘（视图缩放/平移由交互直接调用 drawStatic）
watch(
  [entries, checkpoints],
  () => {
    nextTick(() => drawStatic());
  },
  { deep: true },
);

// 车辆位置更新时，建立插值补间：从"当前渲染位置"过渡到"最新目标位置"
watch(
  () => store.vehicles.map(v => ({ No: v.No, x: v.Position.Pos_X, y: v.Position.Pos_Y })),
  () => {
    const now = performance.now();
    const seen = new Set<string>();
    for (const v of store.vehicles) {
      seen.add(v.No);
      const target = { Pos_X: v.Position.Pos_X, Pos_Y: v.Position.Pos_Y };
      // 起点 = 上一帧的渲染位置；首次出现则直接落到目标位置（无补间）
      const from = renderPositions.get(v.No) ?? target;
      fromPositions.set(v.No, from);
      targetPositions.set(v.No, target);
      if (!renderPositions.has(v.No)) renderPositions.set(v.No, target);
    }
    // 清理已消失的车辆，避免 Map 无限增长
    for (const no of [...renderPositions.keys()]) {
      if (!seen.has(no)) {
        renderPositions.delete(no);
        fromPositions.delete(no);
        targetPositions.delete(no);
      }
    }
    tweenStart = now;
  },
  { deep: true },
);

// requestAnimationFrame 动画循环：逐帧把渲染位置从 from 线性插值到 target，再重绘动态层
const animationLoop = () => {
  const progress = Math.min(1, (performance.now() - tweenStart) / TWEEN_MS);
  for (const [no, target] of targetPositions) {
    const from = fromPositions.get(no) ?? target;
    renderPositions.set(no, interpolatePosition(from, target, progress));
  }
  drawDynamic();
  rafId = requestAnimationFrame(animationLoop);
};

// 处理窗口大小变化
const handleResize = () => {
  if (containerRef.value) {
    // 这里我们不需要改变 canvas 的逻辑尺寸，只改变显示尺寸
    // 因为坐标系统是基于逻辑尺寸的
    nextTick(() => drawStatic());
  }
};

// 初始化绘制
onMounted(() => {
  // 等待图片加载完成后再绘制
  const checkImages = () => {
    if (entryImage.complete && checkpointImage.complete && car1Image.complete && car2Image.complete) {
      imagesLoaded.value = true;
      nextTick(() => drawStatic());
    } else {
      setTimeout(checkImages, 50);
    }
  };

  // 监听窗口大小变化
  window.addEventListener('resize', handleResize);

  checkImages();
  // 启动动态层动画循环
  rafId = requestAnimationFrame(animationLoop);
});

// 清理
onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
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
/* 双层 Canvas：静态层在底，动态层叠加在上方 */
.static-layer {
  position: absolute;
  top: 0;
  left: 0;
}
.dynamic-layer {
  position: relative;
  z-index: 1;
  cursor: grab;
}
.dynamic-layer.panning {
  cursor: grabbing;
}

/* 缩放控制按钮 */
.map-zoom-controls {
  position: absolute;
  bottom: 16px;
  right: 16px;
  z-index: 5;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.zoom-btn {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.92);
  color: #1f2937;
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  transition: background 0.2s, transform 0.1s;
}
.zoom-btn:hover {
  background: #fff;
  transform: translateY(-1px);
}
.zoom-btn:active {
  transform: translateY(0);
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

/* 车辆信息面板样式 */
.vehicle-info-panel {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 300px;
  background-color: rgba(255, 255, 255, 0.95);
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 20px;
  z-index: 100;
  backdrop-filter: blur(10px);
}

.vehicle-info-panel h3 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #333;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}

.info-item {
  display: flex;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.label {
  font-weight: bold;
  color: #555;
  min-width: 80px;
  margin-right: 10px;
}

.value {
  color: #333;
  flex: 1;
}

.close-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #999;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.close-btn:hover {
  background-color: #f0f0f0;
  color: #333;
}
</style>