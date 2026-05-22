import { defineStore } from 'pinia';
import type { Entry, Checkpoint, VehiclePosition, VehicleDetail, VehicleHistory, StatisticsByEntry, PathCongestion } from '@/types';

export const useTrafficStore = defineStore('traffic', {
  state: () => ({
    entries: [] as Entry[],
    checkpoints: [] as Checkpoint[],
    vehicles: [] as VehiclePosition[],
    vehicleDetails: {} as Record<string, VehicleDetail>,
    historyRecords: [] as VehicleHistory[],
    statistics: {} as Record<string, any>,
    pathCongestion: {} as Record<string, number>,
    recentSearches: [] as string[], // 最近搜索车牌
    congestionAlerts: {} as Record<string, boolean>, // 卡口压力预警
    currentPage: 1, // 当前历史记录页码
    totalHistoryPages: 0, // 历史记录总页数
    selectedVehicle: null as string | null, // 当前选中的车辆
  }),

  actions: {
    // 获取出入口信息
    async fetchEntries() {
      try {
        const response = await fetch('http://127.0.0.1:12345/getEntries');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        this.entries = data;
      } catch (error) {
        console.error('获取出入口信息失败:', error);
        // 如果API失败，可以尝试使用本地mock数据
        this.entries = [
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
          }
        ];
      }
    },

    // 获取检查点信息
    async fetchCheckpoints() {
      try {
        const response = await fetch('http://127.0.0.1:12345/getCheckpoints');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        this.checkpoints = data;
      } catch (error) {
        console.error('获取检查点信息失败:', error);
        // 如果API失败，可以尝试使用本地mock数据
        this.checkpoints = [
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
    },

    // 获取车辆实时位置
    async fetchVehiclePositions() {
      try {
        const response = await fetch('http://127.0.0.1:12345/getVehiclePositions');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        this.vehicles = data;
      } catch (error) {
        console.error('获取车辆位置失败:', error);
        // 如果API失败，可以尝试使用本地mock数据
        this.vehicles = [
          {
            No: 'V-2',
            Position: { Pos_X: 200, Pos_Y: 112 }
          },
          {
            No: 'V-3',
            Position: { Pos_X: 0, Pos_Y: 0 }
          }
        ];
      }
    },

    // 获取车辆详细信息
    async fetchVehicleDetail(vehicleNo: string) {
      try {
        const response = await fetch(`http://127.0.0.1:12345/getVehicleDetail?No=${vehicleNo}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        if (data && data.length > 0) {
          this.vehicleDetails[vehicleNo] = data[0];
          return data[0];
        }
      } catch (error) {
        console.error('获取车辆详细信息失败:', error);
        // 如果API失败，可以尝试使用本地mock数据
        this.vehicleDetails[vehicleNo] = {
          No: vehicleNo,
          EnterNo: 'E-W',
          EnterName: '西出入口',
          EnterTime: '/Date(1756871452790+0800)/',
          Speed: 83,
          Position: { Pos_X: 200, Pos_Y: 112 }
        };
        return this.vehicleDetails[vehicleNo];
      }
    },

    // 获取车辆历史信息
    async fetchVehiclesHistory(vehicleNo: string, page: number) {
      try {
        const response = await fetch(`http://127.0.0.1:12345/getVehiclesHistory?No=${vehicleNo}&Page=${page}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        
        // 设置当前页码
        this.currentPage = page;
        
        // 计算总页数（假设每页5条记录）
        this.totalHistoryPages = Math.ceil(data.length / 5);
        
        // 更新历史记录
        this.historyRecords = data;
        return data;
      } catch (error) {
        console.error('获取车辆历史信息失败:', error);
        // 如果API失败，可以尝试使用本地mock数据
        this.historyRecords = [
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
        this.totalHistoryPages = 1;
        return this.historyRecords;
      }
    },

    // 按车牌号汇总车辆费用
    async fetchStatisticsByVehicle(vehicleNo: string) {
      try {
        const response = await fetch(`http://127.0.0.1:12345/getStatisticsByVehicle?No=${vehicleNo}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.text(); // API返回的是单个数字
        this.statistics[`vehicle-${vehicleNo}`] = parseFloat(data);
        return parseFloat(data);
      } catch (error) {
        console.error('获取车辆统计信息失败:', error);
        // 如果API失败，可以尝试使用本地mock数据
        this.statistics[`vehicle-${vehicleNo}`] = 612.1;
        return 612.1;
      }
    },

    // 按出入口汇总通行车辆总数
    async fetchStatisticsByEntry(entryNo: string) {
      try {
        const response = await fetch(`http://127.0.0.1:12345/getStatisticsByEntry?No=${entryNo}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        this.statistics[`entry-${entryNo}`] = data;
        return data;
      } catch (error) {
        console.error('获取出入口统计信息失败:', error);
        // 如果API失败，可以尝试使用本地mock数据
        this.statistics[`entry-${entryNo}`] = { Enter: 15, Exit: 20 };
        return { Enter: 15, Exit: 20 };
      }
    },

    // 计算路径拥挤程度
    calculatePathCongestion() {
      // 根据车辆数量和路径计算拥挤程度
      // 这是一个简化的实现，实际应用中可能需要更复杂的算法
      const congestion: PathCongestion = {};
      
      // 遍历路径上的车辆，计算拥挤程度
      // 简化逻辑：统计在路径附近的车辆数量
      this.entries.forEach(entry => {
        // 为每个路径分配一个ID
        const pathId = `${entry.Start.Pos_X}-${entry.Start.Pos_Y}-${entry.End.Pos_X}-${entry.End.Pos_Y}`;
        // 这里只是示例，实际需要根据路径计算车辆密度
        const vehiclesOnPath = this.vehicles.filter(vehicle => {
          // 判断车辆是否在路径附近（简化判断）
          const dx = Math.abs(vehicle.Position.Pos_X - entry.Position.Pos_X);
          const dy = Math.abs(vehicle.Position.Pos_Y - entry.Position.Pos_Y);
          return dx < 100 && dy < 100; // 在100像素范围内认为在路径上
        }).length;
        
        // 设置拥挤等级 (0-3: 一级, 4-6: 二级, 7+: 三级)
        let level = 0;
        if (vehiclesOnPath >= 7) level = 3;
        else if (vehiclesOnPath >= 4) level = 2;
        else if (vehiclesOnPath >= 1) level = 1;
        
        congestion[pathId] = level;
      });
      
      this.pathCongestion = congestion;
      return congestion;
    },

    // 触发拥挤预警
    triggerCongestionAlerts() {
      // 检查是否有路径拥挤等级超过阈值
      const alerts: Record<string, boolean> = {};
      Object.entries(this.pathCongestion).forEach(([pathId, level]) => {
        if (level >= 3) { // 三级拥挤触发预警
          alerts[pathId] = true;
        } else {
          alerts[pathId] = false;
        }
      });
      this.congestionAlerts = alerts;
    },

    // 保存最近搜索的车牌号
    saveRecentSearch(vehicleNo: string) {
      // 检查是否已存在
      const index = this.recentSearches.indexOf(vehicleNo);
      if (index !== -1) {
        // 如果存在，移到最前面
        this.recentSearches.splice(index, 1);
      }
      // 添加到最前面
      this.recentSearches.unshift(vehicleNo);
      // 只保留最近的5个搜索
      if (this.recentSearches.length > 5) {
        this.recentSearches = this.recentSearches.slice(0, 5);
      }
    },

    // 选择车辆
    selectVehicle(vehicleNo: string) {
      this.selectedVehicle = vehicleNo;
    },

    // 清除选择
    clearSelection() {
      this.selectedVehicle = null;
    }
  }
});