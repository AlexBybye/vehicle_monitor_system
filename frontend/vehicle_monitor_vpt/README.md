# 车流监控系统前端

这是一个基于 Vue 3 + Vite + Pinia + TypeScript 的车流监控系统前端项目，用于监控和分析车辆在指定区域内的流动情况。

## 功能特性

- **实时地图监控**：显示车辆在地图上的实时位置
- **历史轨迹查询**：按车牌号查询车辆历史通行记录
- **统计分析**：按车牌号和出入口统计费用和通行数量
- **路径拥挤分析**：可视化显示道路拥挤程度
- **离线支持**：支持在无网络环境下使用

## 技术栈

- Vue 3
- TypeScript
- Vite
- Pinia (状态管理)
- Canvas (地图渲染)

## 项目结构

```
src/
├── assets/             # 静态资源
├── api/                # 接口封装
├── components/         # 可复用组件
├── views/              # 页面级组件
├── store/              # Pinia 状态管理
├── utils/              # 工具函数
└── types/              # TypeScript 类型定义
```

## 安装与运行

1. 安装依赖：
   ```bash
   npm install
   ```

2. 启动开发服务器：
   ```bash
   npm run dev
   ```

3. 构建生产版本：
   ```bash
   npm run build
   ```

## API 接口

本项目对接以下后端接口：

- `GET /getEntries` - 获取出入口信息
- `GET /getCheckpoints` - 获取检查点信息
- `GET /getVehiclePositions` - 获取车辆实时位置
- `GET /getVehicleDetail?No={车牌号}` - 获取车辆详细信息
- `GET /getVehiclesHistory?No={车牌号}&Page={页码}` - 获取车辆历史信息
- `GET /getStatisticsByVehicle?No={车牌号}` - 汇总车辆费用
- `GET /getStatisticsByEntry?No={出入口编号}` - 汇总通行车辆总数

## 主要组件

- `MapCanvas.vue` - 地图画布组件（集成热力图功能）
- `VehicleIcon.vue` - 车辆图标组件
- `SearchBar.vue` - 搜索栏组件
- `ChartPanel.vue` - 图表面板组件

## 状态管理

使用 Pinia 进行全局状态管理，包括：

- 出入口信息
- 检查点信息
- 车辆实时位置
- 车辆详细信息
- 历史记录
- 统计数据
- 路径拥挤程度
- 最近搜索记录
- 拥堵预警信息

## 浏览器兼容性

支持现代浏览器，包括 Chrome、Firefox、Safari 和 Edge 的最新版本。