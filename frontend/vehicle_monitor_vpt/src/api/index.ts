import type { Entry, Checkpoint, VehiclePosition, VehicleDetail, VehicleHistory, StatisticsByEntry } from '@/types';

// API基础URL
const BASE_URL = 'http://127.0.0.1:12345';

// 获取出入口信息
export const getEntries = async (): Promise<Entry[]> => {
  try {
    const response = await fetch(`${BASE_URL}/getEntries`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('获取出入口信息失败:', error);
    // 返回模拟数据作为备用
    return [
      {
        No: 'E-E',
        Name: '东出入口',
        Position: { Pos_X: 800, Pos_Y: 200 },
        Start: { Pos_X: 600, Pos_Y: 200 },
        End: { Pos_X: 800, Pos_Y: 200 }
      },
      {
        No: 'E-S',
        Name: '南出入口',
        Position: { Pos_X: 200, Pos_Y: 0 },
        Start: { Pos_X: 200, Pos_Y: 0 },
        End: { Pos_X: 200, Pos_Y: 100 }
      },
      {
        No: 'E-W',
        Name: '西出入口',
        Position: { Pos_X: 0, Pos_Y: 400 },
        Start: { Pos_X: 0, Pos_Y: 400 },
        End: { Pos_X: 100, Pos_Y: 400 }
      },
      {
        No: 'E-N',
        Name: '北出入口',
        Position: { Pos_X: 400, Pos_Y: 0 },
        Start: { Pos_X: 400, Pos_Y: 0 },
        End: { Pos_X: 400, Pos_Y: 100 }
      }
    ];
  }
};

// 获取检查点信息
export const getCheckpoints = async (): Promise<Checkpoint[]> => {
  try {
    const response = await fetch(`${BASE_URL}/getCheckpoints`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('获取检查点信息失败:', error);
    // 返回模拟数据作为备用
    return [
      {
        No: 'C-1',
        Name: '检查站 1',
        Position: { Pos_X: 300, Pos_Y: 500 },
        Start: { Pos_X: 200, Pos_Y: 400 },
        End: { Pos_X: 400, Pos_Y: 500 }
      },
      {
        No: 'C-2',
        Name: '检查站 2',
        Position: { Pos_X: 500, Pos_Y: 500 },
        Start: { Pos_X: 400, Pos_Y: 500 },
        End: { Pos_X: 600, Pos_Y: 500 }
      }
    ];
  }
};

// 获取车辆实时位置
export const getVehiclePositions = async (): Promise<VehiclePosition[]> => {
  try {
    const response = await fetch(`${BASE_URL}/getVehiclePositions`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('获取车辆位置失败:', error);
    // 返回模拟数据作为备用
    return [
      {
        No: 'V-1',
        Position: { Pos_X: 200, Pos_Y: 112 }
      },
      {
        No: 'V-2',
        Position: { Pos_X: 300, Pos_Y: 200 }
      },
      {
        No: 'V-3',
        Position: { Pos_X: 0, Pos_Y: 0 } // 表示已离开区域
      }
    ];
  }
};

// 获取车辆详细信息
export const getVehicleDetail = async (vehicleNo: string): Promise<VehicleDetail[]> => {
  try {
    const response = await fetch(`${BASE_URL}/getVehicleDetail?No=${vehicleNo}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('获取车辆详细信息失败:', error);
    // 返回模拟数据作为备用
    return [
      {
        No: vehicleNo,
        EnterNo: 'E-W',
        EnterName: '西出入口',
        EnterTime: '/Date(1756871452790+0800)/',
        Speed: 83,
        Position: { Pos_X: 200, Pos_Y: 112 }
      }
    ];
  }
};

// 获取车辆历史信息
export const getVehiclesHistory = async (vehicleNo: string, page: number): Promise<VehicleHistory[]> => {
  try {
    const response = await fetch(`${BASE_URL}/getVehiclesHistory?No=${vehicleNo}&Page=${page}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('获取车辆历史信息失败:', error);
    // 返回模拟数据作为备用
    return [
      {
        VehicleNo: vehicleNo,
        EnterNo: 'E-N',
        EnterName: '北出入口',
        EnterTime: '/Date(1756871452790+0800)/',
        ExitNo: 'E-E',
        ExitName: '东出入口',
        ExitTime: '/Date(1756871452790+0800)/',
        Charge: 10,
        Speed: 115
      }
    ];
  }
};

// 按车牌号汇总车辆费用
export const getStatisticsByVehicle = async (vehicleNo: string): Promise<number> => {
  try {
    const response = await fetch(`${BASE_URL}/getStatisticsByVehicle?No=${vehicleNo}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.text();
    return parseFloat(data);
  } catch (error) {
    console.error('获取车辆统计信息失败:', error);
    // 返回模拟数据作为备用
    return 612.1;
  }
};

// 按出入口汇总通行车辆总数
export const getStatisticsByEntry = async (entryNo: string): Promise<StatisticsByEntry> => {
  try {
    const response = await fetch(`${BASE_URL}/getStatisticsByEntry?No=${entryNo}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('获取出入口统计信息失败:', error);
    // 返回模拟数据作为备用
    return { Enter: 15, Exit: 20 };
  }
};