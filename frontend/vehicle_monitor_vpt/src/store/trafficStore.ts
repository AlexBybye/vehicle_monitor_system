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
    pathCongestion: {} as Record<string, import('@/types').PathSegment>,
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
        // 如果API失败，使用与API文档一致的mock数据
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
            Position: { Pos_X: 400, Pos_Y: 600 },
            Start: { Pos_X: 400, Pos_Y: 600 },
            End: { Pos_X: 400, Pos_Y: 500 }
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
        // 如果API失败，使用与API文档一致的mock数据
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
          },
          {
            No: 'C-3',
            Name: '检查站 3',
            Position: { Pos_X: 200, Pos_Y: 300 },
            Start: { Pos_X: 200, Pos_Y: 400 },
            End: { Pos_X: 200, Pos_Y: 100 }
          },
          {
            No: 'C-4',
            Name: '检查站 4',
            Position: { Pos_X: 600, Pos_Y: 300 },
            Start: { Pos_X: 600, Pos_Y: 200 },
            End: { Pos_X: 600, Pos_Y: 500 }
          },
          {
            No: 'C-5',
            Name: '检查站 5',
            Position: { Pos_X: 300, Pos_Y: 100 },
            Start: { Pos_X: 200, Pos_Y: 100 },
            End: { Pos_X: 400, Pos_Y: 100 }
          },
          {
            No: 'C-6',
            Name: '检查站 6',
            Position: { Pos_X: 600, Pos_Y: 100 },
            Start: { Pos_X: 400, Pos_Y: 100 },
            End: { Pos_X: 600, Pos_Y: 200 }
          }
        ];
      }
    },

    // 获取车辆位置的mock数据
    getMockVehicles() {
      return [
        // 西部道路（西出入口附近）
        { No: 'V-1', Position: { Pos_X: 50, Pos_Y: 400 } },
        { No: 'V-2', Position: { Pos_X: 120, Pos_Y: 400 } },
        // 北部道路（检查站1附近）
        { No: 'V-3', Position: { Pos_X: 300, Pos_Y: 520 } },
        { No: 'V-4', Position: { Pos_X: 350, Pos_Y: 500 } },
        { No: 'V-5', Position: { Pos_X: 400, Pos_Y: 580 } },
        // 东部道路（检查站2附近）
        { No: 'V-6', Position: { Pos_X: 500, Pos_Y: 500 } },
        { No: 'V-7', Position: { Pos_X: 550, Pos_Y: 500 } },
        // 南部道路（检查站3附近）
        { No: 'V-8', Position: { Pos_X: 200, Pos_Y: 350 } },
        { No: 'V-9', Position: { Pos_X: 200, Pos_Y: 250 } },
        // 东南道路（检查站4附近）
        { No: 'V-10', Position: { Pos_X: 600, Pos_Y: 350 } },
        { No: 'V-11', Position: { Pos_X: 600, Pos_Y: 450 } },
        // 底部道路（检查站5、6附近）
        { No: 'V-12', Position: { Pos_X: 300, Pos_Y: 100 } },
        { No: 'V-13', Position: { Pos_X: 450, Pos_Y: 100 } },
        { No: 'V-14', Position: { Pos_X: 600, Pos_Y: 150 } },
        // 东部出口附近
        { No: 'V-15', Position: { Pos_X: 700, Pos_Y: 200 } },
        // 已离开区域的车辆
        { No: 'V-16', Position: { Pos_X: 0, Pos_Y: 0 } }
      ];
    },

    // 获取车辆实时位置
    async fetchVehiclePositions() {
      try {
        const response = await fetch('http://127.0.0.1:12345/getVehiclePositions');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        
        // 如果后端返回空数据，使用mock数据作为备用
        if (!data || data.length === 0) {
          console.warn('后端返回空数据，使用mock数据');
          this.vehicles = this.getMockVehicles();
        } else {
          this.vehicles = data;
        }
        
        // 车辆位置更新后，自动计算拥堵度
        this.calculatePathCongestion();
        this.triggerCongestionAlerts();
      } catch (error) {
        console.error('获取车辆位置失败:', error);
        // 如果API失败，使用本地mock数据
        this.vehicles = this.getMockVehicles();
        this.calculatePathCongestion();
        this.triggerCongestionAlerts();
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
      
      // 定义路径类型
      interface PathInfo {
        id: string;
        start: { Pos_X: number; Pos_Y: number };
        end: { Pos_X: number; Pos_Y: number };
        name: string;
      }
      
      // 将以左下角为原点的坐标转换为以左上角为原点的坐标（画布坐标）
      const convertCoord = (x: number, y: number): {x: number, y: number} => {
        return { x, y: 600 - y }; // 600是画布高度
      };
      
      // 将路径按指定长度切分的辅助函数
      const createSegmentedPaths = (start: { Pos_X: number; Pos_Y: number }, 
                                  end: { Pos_X: number; Pos_Y: number }, 
                                  baseId: string, 
                                  baseName: string, 
                                  segmentLength: number = 100): PathInfo[] => {
        const dx = end.Pos_X - start.Pos_X;
        const dy = end.Pos_Y - start.Pos_Y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= segmentLength) {
          // 如果距离小于等于段长度，则直接返回一条路径
          return [{
            id: baseId,
            start: start,
            end: end,
            name: baseName
          }];
        } else {
          // 否则按段长度切分
          const segments = Math.ceil(distance / segmentLength);
          const stepX = dx / segments;
          const stepY = dy / segments;
          
          const segmentedPaths: PathInfo[] = [];
          for (let i = 0; i < segments; i++) {
            const segStartX = start.Pos_X + stepX * i;
            const segStartY = start.Pos_Y + stepY * i;
            const segEndX = start.Pos_X + stepX * (i + 1);
            const segEndY = start.Pos_Y + stepY * (i + 1);
            
            segmentedPaths.push({
              id: `${baseId}-seg${i+1}`,
              start: { Pos_X: segStartX, Pos_Y: segStartY },
              end: { Pos_X: segEndX, Pos_Y: segEndY },
              name: `${baseName} 第${i+1}段`
            });
          }
          
          return segmentedPaths;
        }
      };
      
      // 计算点到线段的距离
      const distanceFromPointToSegment = (px: number, py: number, x1: number, y1: number, x2: number, y2: number): number => {
        // 将左下角坐标系转换为左上角坐标系进行计算
        const convertedP = convertCoord(px, py);
        const convertedP1 = convertCoord(x1, y1);
        const convertedP2 = convertCoord(x2, y2);
        
        const A = convertedP.x - convertedP1.x;
        const B = convertedP.y - convertedP1.y;
        const C = convertedP2.x - convertedP1.x;
        const D = convertedP2.y - convertedP1.y;
        
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;
        if (lenSq !== 0) // 确保线段长度不为0
          param = dot / lenSq;
        
        let xx, yy;
        if (param < 0) {
          xx = convertedP1.x;
          yy = convertedP1.y;
        } else if (param > 1) {
          xx = convertedP2.x;
          yy = convertedP2.y;
        } else {
          xx = convertedP1.x + param * C;
          yy = convertedP1.y + param * D;
        }
        
        const dx = convertedP.x - xx;
        const dy = convertedP.y - yy;
        return Math.sqrt(dx * dx + dy * dy);
      };
      
      // 遍历所有可能的路径（出入口到检查点，检查点到检查点，检查点到出入口）
      // 构建所有路径的列表
      const allPaths: PathInfo[] = [];
      
      // 根据您提供的详细连接规则重新定义道路网络
      // 标记点坐标：
      // 北标记点 (400, 600), 南标记点 (200, 0), 西标记点 (0, 400), 东标记点 (800, 200)
      // 节点坐标：
      // 节点 1 (300, 500), 节点 2 (500, 500), 节点 3 (200, 300), 节点 4 (600, 300), 节点 5 (300, 100), 节点 6 (600, 100)
      // 中间点坐标：
      // (200, 400), (200, 500), (400, 500), (600, 500), (600, 200), (400, 100)
      
      // 清空现有路径，重新定义
      allPaths.length = 0;
      
      // 1. (0, 400) 与 (200, 400) 双向连接
      allPaths.push(...createSegmentedPaths(
        { Pos_X: 0, Pos_Y: 400 },
        { Pos_X: 200, Pos_Y: 400 },
        'path:W->mid-left-top',
        '西出入口 -> 左侧中间点'
      ));
      allPaths.push(...createSegmentedPaths(
        { Pos_X: 200, Pos_Y: 400 },
        { Pos_X: 0, Pos_Y: 400 },
        'path:mid-left-top->W',
        '左侧中间点 -> 西出入口'
      ));
      
      // 2. 从(300,500)先到(200,500)再到(200,400) - 您指定的新路径
      // (300, 500) 到 (200, 500)
      allPaths.push(...createSegmentedPaths(
        { Pos_X: 300, Pos_Y: 500 },
        { Pos_X: 200, Pos_Y: 500 },
        'path:C-1->mid-top-left-x',
        '检查站1 -> 顶部左侧中间点X'
      ));
      // (200, 500) 到 (200, 400)
      allPaths.push(...createSegmentedPaths(
        { Pos_X: 200, Pos_Y: 500 },
        { Pos_X: 200, Pos_Y: 400 },
        'path:mid-top-left-x->mid-left-top',
        '顶部左侧中间点X -> 左侧中间点'
      ));
      
      // 3. (200, 400) 与 (200, 300) 单向连接（箭头由 (200, 400) 指向 (200, 300)）
      allPaths.push(...createSegmentedPaths(
        { Pos_X: 200, Pos_Y: 400 },
        { Pos_X: 200, Pos_Y: 300 },
        'path:mid-left-top->C-3',
        '左侧中间点 -> 检查站3'
      ));
      
      // 4. (200, 300) 与 (200, 100) 单向连接（箭头由 (200, 300) 指向 (200, 100)）
      allPaths.push(...createSegmentedPaths(
        { Pos_X: 200, Pos_Y: 300 },
        { Pos_X: 200, Pos_Y: 100 },
        'path:C-3->mid-left-bottom',
        '检查站3 -> 左侧下部中间点'
      ));
      
      // 5. (200, 0) 与 (200, 100) 双向连接（箭头由 (200, 0) 指向 (200, 100)）
      allPaths.push(...createSegmentedPaths(
        { Pos_X: 200, Pos_Y: 0 },
        { Pos_X: 200, Pos_Y: 100 },
        'path:S->mid-left-bottom',
        '南出入口 -> 左侧下部中间点'
      ));
      allPaths.push(...createSegmentedPaths(
        { Pos_X: 200, Pos_Y: 100 },
        { Pos_X: 200, Pos_Y: 0 },
        'path:S->mid-left-bottom',
        '左侧下部中间点 ->南出入口 '
      ));
      
      // 6. (200, 100) 与 (300, 100) 单向连接（箭头由 (200, 100) 指向 (300, 100)）
      allPaths.push(...createSegmentedPaths(
        { Pos_X: 200, Pos_Y: 100 },
        { Pos_X: 300, Pos_Y: 100 },
        'path:mid-left-bottom->C-5',
        '左侧下部中间点 -> 检查站5'
      ));
      
      // 7. (300, 100) 与 (600, 100) 单向连接（箭头由 (300, 100) 指向 (600, 100)）- 注意：这里应该是直接连接C-5到C-6
      allPaths.push(...createSegmentedPaths(
        { Pos_X: 300, Pos_Y: 100 },
        { Pos_X: 600, Pos_Y: 100 },
        'path:C-5->C-6',
        '检查站5 -> 检查站6'
      ));
      
      // 8. (600, 100) 与 (600, 200) 单向连接（箭头由 (600, 100) 指向 (600, 200)）
      allPaths.push(...createSegmentedPaths(
        { Pos_X: 600, Pos_Y: 100 },
        { Pos_X: 600, Pos_Y: 200 },
        'path:C-6->mid-right-bottom',
        '检查站6 -> 右侧下部中间点'
      ));
      
      // 9. (800, 200) 与 (600, 200) 双向连接
      allPaths.push(...createSegmentedPaths(
        { Pos_X: 800, Pos_Y: 200 },
        { Pos_X: 600, Pos_Y: 200 },
        'path:E->mid-right-bottom',
        '东出入口 -> 右侧下部中间点'
      ));
      allPaths.push(...createSegmentedPaths(
        { Pos_X: 600, Pos_Y: 200 },
        { Pos_X: 800, Pos_Y: 200 },
        'path:mid-right-bottom->E',
        '右侧下部中间点 -> 东出入口'
      ));
      // 10. (600, 200) 与 (600, 300) 单向连接（箭头由 (600, 200) 指向 (600, 300)）
      allPaths.push(...createSegmentedPaths(
        { Pos_X: 600, Pos_Y: 200 },
        { Pos_X: 600, Pos_Y: 300 },
        'path:mid-right-bottom->C-4',
        '右侧下部中间点 -> 检查站4'
      ));
      
      // 11. (600, 300) 与 (600, 500) 单向连接（箭头由 (600, 300) 指向 (600, 500)）
      allPaths.push(...createSegmentedPaths(
        { Pos_X: 600, Pos_Y: 300 },
        { Pos_X: 600, Pos_Y: 500 },
        'path:C-4->mid-right-top',
        '检查站4 -> 右侧上部中间点'
      ));
      
      // 12. (600, 500) 与 (500, 500) 单向连接（箭头由 (600, 500) 指向 (500, 500)）
      allPaths.push(...createSegmentedPaths(
        { Pos_X: 600, Pos_Y: 500 },
        { Pos_X: 500, Pos_Y: 500 },
        'path:mid-right-top->C-2',
        '右侧上部中间点 -> 检查站2'
      ));
      
      // 13. (500, 500) 与 (400, 500) 单向连接（箭头由 (500, 500) 指向 (400, 500)）
      allPaths.push(...createSegmentedPaths(
        { Pos_X: 500, Pos_Y: 500 },
        { Pos_X: 400, Pos_Y: 500 },
        'path:C-2->mid-top-center',
        '检查站2 -> 顶部中心点'
      ));
      
      // 14. (400, 600) 与 (400, 500) 双向连接（箭头由 (400, 600) 指向 (400, 500)）
      allPaths.push(...createSegmentedPaths(
        { Pos_X: 400, Pos_Y: 600 },
        { Pos_X: 400, Pos_Y: 500 },
        'path:N->mid-top-center',
        '北出入口 -> 顶部中心点'
      ));
       allPaths.push(...createSegmentedPaths(
        { Pos_X: 400, Pos_Y: 500 },
        { Pos_X: 400, Pos_Y: 600 },
        'path:mid-top-center->N',
        '顶部中心点 -> 北出入口'
      ));
      // 15. (400, 500) 与 (300, 500) 单向连接（箭头由 (400, 500) 指向 (300, 500)）
      allPaths.push(...createSegmentedPaths(
        { Pos_X: 400, Pos_Y: 500 },
        { Pos_X: 300, Pos_Y: 500 },
        'path:mid-top-center->C-1',
        '顶部中心点 -> 检查站1'
      ));
      
      // 创建一个映射，将每对端点映射到它们之间的所有车辆
      // 对于每对端点，我们只需要计算一次通过该路径的车辆数，而不是为每个方向分别计算
      const pathPairVehicles: Record<string, number> = {};
      
      // 先找出所有唯一的端点对
      const uniquePairs: Record<string, { start: any, end: any }> = {};
      allPaths.forEach(path => {
        const pathParts = path.id.substring(5).split('->'); // 移除 'path:' 前缀并分割
        if (pathParts.length === 2) {
          const pointA = pathParts[0];
          const pointB = pathParts[1];
          const pairKey = [pointA, pointB].sort().join('|'); // 排序以确保 AB 和 BA 得到相同的键
          
          // 只记录一次端点对的坐标信息
          if (!uniquePairs[pairKey]) {
            uniquePairs[pairKey] = { start: path.start, end: path.end };
          }
        }
      });
      
      // 为每个唯一端点对计算车辆数量
      Object.entries(uniquePairs).forEach(([pairKey, pathInfo]) => {
        const vehiclesOnPath = this.vehicles.filter(vehicle => {
          // 过滤掉位置为(0,0)的无效车辆
          if (vehicle.Position.Pos_X === 0 && vehicle.Position.Pos_Y === 0) {
            return false;
          }
          
          // 使用点到线段的距离公式来判断车辆是否在路径附近
           const distance = distanceFromPointToSegment(
             vehicle.Position.Pos_X, 
             vehicle.Position.Pos_Y,
             pathInfo.start.Pos_X,
             pathInfo.start.Pos_Y,
             pathInfo.end.Pos_X,
             pathInfo.end.Pos_Y
           );
          
          return distance < 100; // 在路径100像素范围内认为在该路径上，增加容错范围
        }).length;
        
        pathPairVehicles[pairKey] = vehiclesOnPath;
      });
      
      // 现在为每条路径分配拥堵级别，同对端点的路径共享相同的拥堵级别
      allPaths.forEach(path => {
        const pathParts = path.id.substring(5).split('->');
        if (pathParts.length === 2) {
          const pointA = pathParts[0];
          const pointB = pathParts[1];
          const pairKey = [pointA, pointB].sort().join('|');
          
          const totalVehicles = pathPairVehicles[pairKey] || 0;
          
          // 设置拥堵等级 (0-3: 一级, 4-6: 二级, 7+: 三级) - 按照明确的需求标准
          let level = 0;
          if (totalVehicles >= 7) level = 3;  // 7辆及以上：三级拥堵（严重）
          else if (totalVehicles >= 4&& totalVehicles < 7) level = 2;  // 4-6辆：二级拥堵（较严重）
          else if (totalVehicles >= 0&& totalVehicles < 4) level = 1;  // 1-3辆：一级拥堵（轻微）

          
          congestion[path.id] = {
            id: path.id,
            start: path.start,
            end: path.end,
            congestionLevel: level
          };
        }
      });
      
      // 同时也要为检查点本身计算拥挤程度
      this.checkpoints.forEach(checkpoint => {
        const checkpointId = `checkpoint-${checkpoint.No}`;
        const vehiclesNearCheckpoint = this.vehicles.filter(vehicle => {
          if (vehicle.Position.Pos_X === 0 && vehicle.Position.Pos_Y === 0) {
            return false;
          }
          
          const dx = Math.abs(vehicle.Position.Pos_X - checkpoint.Position.Pos_X);
          const dy = Math.abs(vehicle.Position.Pos_Y - checkpoint.Position.Pos_Y);
          return Math.sqrt(dx * dx + dy * dy) < 50; // 在检查点50像素范围内
        }).length;
        
        // 设置检查点的拥挤等级
        let level = 0;
        if (vehiclesNearCheckpoint >= 7) level = 3;
        else if (vehiclesNearCheckpoint >= 4&& vehiclesNearCheckpoint < 7) level = 2;
        else if (vehiclesNearCheckpoint >= 0&& vehiclesNearCheckpoint < 4) level = 1;
        
        congestion[checkpointId] = {
          id: checkpointId,
          start: checkpoint.Position,
          end: checkpoint.Position,
          congestionLevel: level
        };
      });
      
      this.pathCongestion = congestion;
      return congestion;
    },



    // 触发拥挤预警
    triggerCongestionAlerts() {
      // 检查是否有路径拥挤等级超过阈值
      const alerts: Record<string, boolean> = {};
      Object.entries(this.pathCongestion).forEach(([pathId, pathSegment]) => {
        const level = pathSegment.congestionLevel;
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