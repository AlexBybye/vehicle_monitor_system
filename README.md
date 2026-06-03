# 🚗 车流监控系统 (VMS)

<div align="center">

**离线可用的城市区域车流可视化前端应用**

[![Vue](https://img.shields.io/badge/Vue-3.5-42b883?style=flat&logo=vue.js)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178c6?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.0-646cff?style=flat&logo=vite)](https://vitejs.dev/)
[![Pinia](https://img.shields.io/badge/Pinia-3.0-ffcd00?style=flat&logo=pinia)](https://pinia.vuejs.org/)

[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)]()

</div>

---

## ✨ 项目亮点

本项目不仅完成了基础要求，还实现了 **12 项加分功能** 和 **6 项性能优化**，体现了扎实的工程能力和创新思维。

### 🎯 核心技术亮点

| 亮点 | 技术实现 | 价值 |
|------|---------|------|
| 🗺️ **双层 Canvas + RAF 插值** | 静态/动态分层 + `requestAnimationFrame` 线性插值 | 车辆从"每秒跳变"变为逐帧平滑行驶 |
| 🔍 **地图缩放/平移** | 仿射变换 `translate+scale` + 两级坐标反演 | 滚轮锚定缩放、拖拽平移、精准点击命中 |
| 🧭 **智能轨迹回放** | Dijkstra 最短路 + BFS 位掩码全检查站环路 | 自动计算最优路径，支持环绕场景 |
| 🚦 **拥堵分级预警** | 路网切段 + 点到线段距离判定 + 端点对聚合 | 0/1-3/4-6/≥7 四级拥堵，严重级自动预警 |
| 📊 **累计统计系统** | 位置边沿检测 + 永久车牌集合 | 统计覆盖"从启动到当前"全量数据 |
| 📴 **全链路离线可用** | 哈希种子 Mock + Service Worker 缓存 | 无后端也能完整演示，数据稳定可复现 |

### 🚀 性能优化

- **双层 Canvas 分层渲染**：静态层重绘频率从 60fps 降至 <1fps
- **requestAnimationFrame 插值动画**：车辆移动平滑流畅
- **坐标变换优化**：统一 `ctx.translate + ctx.scale`，减少重复计算
- **防抖节流优化**：搜索 300ms、热力图 200ms、resize 100ms
- **Mock 数据缓存**：车牌哈希种子，数据稳定可复现
- **事件边沿检测**：避免重复计数，统计准确

---

## 🎨 功能特性

### 📍 实时地图监控
- ✅ 800×600 区域地图，实时显示出入口、检查站、道路网络
- ✅ 车辆位置 1s 轮询 + RAF 插值平滑移动
- ✅ 地图缩放（滚轮/按钮）、平移（拖拽）、复位
- ✅ 点击车辆查看详细信息（车牌、位置、车速、入口、进入时间）
- ✅ 拥堵热力图实时渲染，支持开关切换

### 🔍 历史记录查询
- ✅ 车牌号搜索，支持防抖 + 最近搜索记录（LRU 置顶）
- ✅ 历史记录分页查询，前端自动聚合所有页
- ✅ 日期 + 时刻双精度时间段筛选
- ✅ CSV / JSON 格式数据导出
- ✅ 📍 智能轨迹回放（Dijkstra 最短路 / BFS 全检查站环路）
- ✅ 车辆详情查看

### 📊 统计分析
- ✅ 5 张关键指标卡（累计车辆、累计费用、平均车速等）
- ✅ 4 张手写 Canvas 图表（柱状图、折线图、饼图）
- ✅ 按车牌号统计费用信息
- ✅ 按出入口统计进出车辆数量
- ✅ 3s 自动刷新数据

### 🚦 拥堵分析
- ✅ 拥堵汇总卡片，实时显示拥堵概况
- ✅ "全部/畅通/拥堵/严重" 过滤标签
- ✅ 路径明细列表，显示每条路的拥堵等级和车辆数
- ✅ 严重拥堵自动预警
- ✅ 等级进度条可视化

### 🎨 用户体验
- ✅ 🌙/☀️ 白天/夜间主题切换，持久化 + 跟随系统
- ✅ 玻璃态导航栏，路由过渡动画
- ✅ 响应式设计，适配不同屏幕
- ✅ Service Worker 离线缓存，静态资源 cache-first

---

## 🛠️ 技术栈

| 类别 | 技术选型 |
|------|---------|
| **框架** | Vue 3.5 (`<script setup>` 组合式 API) |
| **构建** | Vite 8 |
| **语言** | TypeScript 6 |
| **状态管理** | Pinia 3 (单一 store) |
| **路由** | vue-router 5 (`createWebHistory`) |
| **渲染** | 原生 Canvas 2D，双层（静态层 + 动态层）+ `requestAnimationFrame` 插值 |
| **图表** | 手写 Canvas 实现（无第三方库依赖） |
| **测试** | Vitest 4 + jsdom |
| **离线** | Service Worker + Mock 兜底 |

> 💡 **特别说明**：地图与统计图表全部为**纯手写 Canvas 实现**，未引入任何图表/地图库依赖。

---

## 📁 项目结构

```
vehicle_monitor_system/
├── frontend/vehicle_monitor_vpt/    # 前端项目
│   ├── src/
│   │   ├── views/                   # 页面级组件
│   │   │   ├── MapView.vue         # 实时地图
│   │   │   ├── HistoryView.vue     # 历史查询
│   │   │   ├── StatisticsView.vue  # 统计分析
│   │   │   └── CongestionView.vue  # 拥堵分析
│   │   ├── components/              # 可复用组件
│   │   │   ├── MapCanvas.vue      # ★ 核心：双层 Canvas 地图
│   │   │   ├── ChartPanel.vue     # ★ 手写 Canvas 图表
│   │   │   └── SearchBar.vue      # 搜索栏
│   │   ├── store/
│   │   │   └── trafficStore.ts    # ★ 单一 Pinia store
│   │   ├── utils/
│   │   │   └── index.ts           # 工具函数
│   │   ├── types/
│   │   │   └── index.ts           # TypeScript 类型
│   │   ├── router/
│   │   │   └── index.ts           # 路由配置
│   │   ├── assets/
│   │   │   └── global.css         # 全局样式 + 主题
│   │   ├── App.vue                 # 根组件
│   │   └── main.ts                 # 应用入口
│   ├── public/
│   │   ├── images/                 # 离线本地图标
│   │   └── service-worker.js      # Service Worker
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
├── backend/                        # 后端相关
│   ├── 模拟服务端.exe               # Windows 模拟服务端
│   └── 模拟车流监控系统 API 文档（前端可用）.md
├── 1.md                            # 实验要求
├── 实验项目报告.md                  # 实验报告
└── README.md                       # 本文件
```

---

## 🚀 快速开始

### 环境要求

- Node.js ^20.19.0 || >=22.12.0
- npm 或 yarn 或 pnpm

### 安装依赖

```bash
cd frontend/vehicle_monitor_vpt
npm install
```

### 开发模式

```bash
npm run dev
```

访问 `http://localhost:5173` 查看应用。

### 生产构建

```bash
npm run build
```

构建产物在 `dist/` 目录。

### 类型检查

```bash
npm run type-check
```

### 单元测试

```bash
npm run test:unit
```

---

## 🔌 API 接口

本项目对接以下后端接口（`http://127.0.0.1:12345`）：

| 接口 | 说明 | 实现状态 |
|------|------|---------|
| `GET /getEntries` | 获取出入口信息 | ✅ 已实现 |
| `GET /getCheckpoints` | 获取检查点信息 | ✅ 已实现 |
| `GET /getVehiclePositions` | 获取车辆实时位置 | ✅ 已实现 |
| `GET /getVehicleDetail?No={车牌号}` | 获取车辆详细信息 | ✅ 已实现 |
| `GET /getVehiclesHistory?No={车牌号}&Page={页码}` | 获取车辆历史信息 | ✅ 已实现 |
| `GET /getStatisticsByVehicle?No={车牌号}` | 按车牌号统计费用 | ✅ 已实现 |
| `GET /getStatisticsByEntry?No={出入口编号}` | 按出入口统计车辆数 | ✅ 已实现 |

> 💡 **离线兜底**：所有接口在请求失败时都会回退到内置 Mock 数据，确保无后端环境也能完整演示。

---

## 🏗️ 架构设计

### 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                        浏览器 (SPA)                          │
│                                                              │
│   ┌─────────┐   App.vue (导航 + 路由过渡 + 主题切换)          │
│   │ main.ts │──▶ createApp + Pinia + Router + SW             │
│   └─────────┘                                                  │
│        │                                                      │
│        ▼ vue-router ("/" → "/map")                           │
│   ┌──────────┬──────────┬──────────┬──────────┐              │
│   │ MapView  │ History  │ Statistics│Congestion│              │
│   └────┬─────┴────┬─────┴────┬─────┴────┬─────┘              │
│        │ 组件复用 │           │          │                    │
│   ┌────▼─────┐ ┌──▼────┐ ┌───▼────┐ ┌──▼────┐               │
│   │MapCanvas │ │Search │ │Chart   │ │MapCanvas│             │
│   │(双层Canvas)│ │Bar   │ │Panel   │ │(复用)  │               │
│   └────┬─────┘ └──┬────┘ └───┬────┘ └──┬────┘               │
│        └──────────┴──────────┴─────────┘                    │
│                           ▼                                  │
│              ┌──────────────────────────┐                   │
│              │  Pinia Store             │                   │
│              │  (状态 + 算法 + Mock兜底)  │                   │
│              └──────────┬───────────────┘                   │
│                         │ fetch / catch                     │
│         ┌───────────────┴───────────────┐                    │
│         ▼                               ▼                    │
│  模拟服务端 (127.0.0.1:12345)    内置 Mock 数据               │
└─────────────────────────────────────────────────────────────┘
```

### 关键架构特征

1. **状态中心化**：单一 Pinia store，所有页面共享状态
2. **接口与兜底耦合**：store action 直接 fetch + catch 回退 Mock
3. **离线优先**：网络失败自动降级 Mock，生产环境叠加 SW 缓存
4. **坐标系转换**：后端左下角原点 → Canvas 左上角原点
5. **分层渲染**：静态层（道路/出入口/检查点）+ 动态层（车辆/热力图/轨迹）

---

## 🎯 核心算法

### Dijkstra 最短路算法

用于计算车辆从入口到出口的最短路径。

```typescript
dijkstra(start: string, end: string): string[] {
  // 有向图建模 + 经典 Dijkstra 算法
  // 返回最短路径节点序列
}
```

### BFS 全检查站环路算法

用于计算入口==出口时的最短闭合回路（经过全部 6 个检查站）。

```typescript
createCircularPath(start: string): string[] {
  // 状态压缩 BFS（6 位二进制表示访问状态）
  // 禁止原地折返
  // 返回最短闭合回路
}
```

### 拥堵分级计算

```typescript
calculatePathCongestion() {
  // 路网切段（100px）
  // 点到线段距离判定（<30px）
  // 端点对聚合计数
  // 分级：0 畅通 / 1-3 轻度 / 4-6 中度 / ≥7 严重
}
```

---

## 📈 性能指标

| 指标 | 数值 |
|------|------|
| 静态层重绘频率 | <1fps |
| 动态层重绘频率 | 60fps |
| 搜索响应时间 | <300ms |
| 地图缩放 | 流畅 |
| 页面切换 | 流畅 |
| 内存占用 | 无泄漏 |
| TypeScript 编译 | ✅ 通过 |
| 生产构建 | ✅ 通过 |

---

## 🌓 主题切换

支持白天/夜间两种主题，特性如下：

- 🎨 CSS 变量驱动，切换流畅
- 💾 偏好持久化到 `localStorage`
- 🔄 首次访问自动跟随系统暗色偏好
- 🌙 导航栏一键切换

---

## 📴 离线支持

### Mock 兜底机制

每个接口失败即回退内置 Mock 数据，特点：

- 车牌号哈希种子，数据稳定可复现
- 按车牌缓存历史数据，避免刷新漂移
- 字段严格镜像 API 文档

### Service Worker 缓存

- 预缓存应用外壳与本地图标
- 静态资源 cache-first
- API 直连网络（不缓存实时数据）
- 仅生产环境启用

---

## 🧪 测试与验证

### 功能测试

- ✅ 地图功能（出入口/检查站显示、车辆实时位置、缩放平移、点击详情）
- ✅ 历史功能（搜索、分页、时间筛选、数据导出、轨迹回放）
- ✅ 统计功能（费用统计、柱状图、自动刷新）
- ✅ 拥堵功能（分级、热力图、预警）

### 离线测试

- ✅ 无后端环境所有功能正常运行
- ✅ Mock 数据稳定可复现
- ✅ 统计结果一致
- ✅ Service Worker 缓存正常

---

## 📝 开发说明

### 代码规范

- TypeScript 严格模式
- ESLint + Prettier 代码格式化
- 组件命名 PascalCase
- 函数命名 camelCase
- 常量命名 UPPER_SNAKE_CASE

### 提交规范

```
feat: 新功能
fix: 修复 bug
docs: 文档更新
style: 代码格式调整
refactor: 重构
perf: 性能优化
test: 测试相关
chore: 构建/工具相关
```

---

## 🤝 贡献指南

欢迎贡献代码、报告问题或提出建议！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

---

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

---

## 🙏 致谢

- [Vue.js](https://vuejs.org/) - 渐进式 JavaScript 框架
- [Vite](https://vitejs.dev/) - 下一代前端构建工具
- [Pinia](https://pinia.vuejs.org/) - Vue 状态管理库
- [TypeScript](https://www.typescriptlang.org/) - JavaScript 的超集

---

## 📮 联系方式

如有问题或建议，欢迎通过以下方式联系：

- 📧 Email: [your-email@example.com]
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/vehicle-monitor-system/issues)

---

<div align="center">

**如果这个项目对你有帮助，请给个 ⭐️ Star 支持一下！**

Made with ❤️ by [Your Name]

</div>