// 车辆位置信息
export interface VehiclePosition {
  No: string; // 车牌号
  Position: {
    Pos_X: number; // X坐标
    Pos_Y: number; // Y坐标
  };
}

// 车辆详细信息
export interface VehicleDetail {
  No: string; // 车牌号
  EnterNo: string; // 入口编号
  EnterName: string; // 入口名称
  EnterTime: string; // 进入时间
  Speed: number; // 车速
  Position: {
    Pos_X: number; // X坐标
    Pos_Y: number; // Y坐标
  };
}

// 出入口信息
export interface Entry {
  No: string; // 编号
  Name: string; // 名称
  Position: {
    Pos_X: number; // 当前位置X坐标
    Pos_Y: number; // 当前位置Y坐标
  };
  Start: {
    Pos_X: number; // 起始X坐标
    Pos_Y: number; // 起始Y坐标
  };
  End: {
    Pos_X: number; // 结束X坐标
    Pos_Y: number; // 结束Y坐标
  };
}

// 检查点信息
export interface Checkpoint {
  No: string; // 编号
  Name: string; // 名称
  Position: {
    Pos_X: number; // 当前位置X坐标
    Pos_Y: number; // 当前位置Y坐标
  };
  Start: {
    Pos_X: number; // 起始X坐标
    Pos_Y: number; // 起始Y坐标
  };
  End: {
    Pos_X: number; // 结束X坐标
    Pos_Y: number; // 结束Y坐标
  };
}

// 车辆历史信息
export interface VehicleHistory {
  VehicleNo: string; // 车牌号
  EnterNo: string; // 入口编号
  EnterName: string; // 入口名称
  EnterTime: string; // 进入时间
  ExitNo?: string; // 出口编号
  ExitName?: string; // 出口名称
  ExitTime?: string; // 离开时间
  Charge?: number; // 费用
  Speed?: number; // 车速
}

// 统计信息
export interface StatisticsByEntry {
  Enter: number; // 进入车辆数
  Exit: number; // 离开车辆数
}

// 路径段信息
export interface PathSegment {
  id: string; // 路径段ID
  name?: string; // 用户可读的中文名（如"西出入口 ↔ 中间点-左中"或"检查站 1"）
  start: { Pos_X: number; Pos_Y: number }; // 起点坐标
  end: { Pos_X: number; Pos_Y: number }; // 终点坐标
  congestionLevel: number; // 拥挤等级
  vehicleCount?: number; // 该路径上当前的车辆数（用于详情显示）
}

// 路径拥挤程度
export interface PathCongestion {
  [key: string]: PathSegment; // 路径ID -> 路径段信息
}