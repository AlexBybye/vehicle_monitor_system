# 车辆监控系统

基于Vue3和Canvas的实时车辆监控系统，支持车辆位置跟踪、历史记录查询、拥挤度分析等功能。

## 项目结构

```
vehicle_monitor_system/
├── public/                 # 静态资源
│   ├── lib/               # 离线依赖库
│   │   ├── vue.global.js  # Vue3离线版本
│   │   └── axios.min.js   # Axios离线版本
│   └── assets/            # 静态资源（图片等）
├── src/                   # 源代码
│   ├── api/               # API请求封装
│   │   └── request.js     # 请求处理和时间格式转换
│   ├── components/        # Vue组件
│   │   ├── MapView.js     # 地图画布组件
│   │   ├── Control.js     # 控制面板组件
│   │   └── Detail.js      # 详情弹窗组件
│   ├── hooks/             # 自定义Hook
│   │   └── useTraffic.js  # 交通数据处理逻辑
│   ├── App.js             # 根组件
│   └── main.js            # 应用入口
├── index.html             # 应用入口HTML
└── backend/               # 后端API文档
    └── api_instruction.md # API接口说明
```

## 功能特性

1. **实时车辆监控**：通过Canvas实现车辆位置实时更新
2. **历史记录查询**：支持按车牌号查询历史通行记录
3. **拥挤度分析**：根据车辆密度显示道路拥挤状况
4. **统计分析**：提供单车费用和出入口统计
5. **离线运行**：支持离线环境运行，包含完整的本地依赖

## 技术栈

- Vue 3 (Composition API)
- Canvas API (图形渲染)
- Axios (HTTP请求)
- ES6+ (现代JavaScript)

## API接口

- `GET /getEntries` - 获取所有出入口信息
- `GET /getCheckpoints` - 获取所有检查点信息
- `GET /getVehiclePositions` - 获取车辆实时位置
- `GET /getVehicleDetail?no={车牌号}` - 获取车辆详细信息
- `GET /getVehiclesHistory?page={页码}` - 获取车辆历史记录
- `GET /getStatisticsByVehicle` - 获取单车费用统计
- `GET /getStatisticsByEntry` - 获取出入口统计

## 运行项目

1. 启动后端服务（localhost:12345）
2. 打开 `index.html` 文件或使用本地服务器

## 亮点功能

- 双层Canvas渲染（静态背景+动态车辆）
- 拥挤度可视化（绿/黄/红三级标识）
- 离线降级策略（Mock数据）
- 实时预警机制（卡口压力监控）
- 响应式设计支持