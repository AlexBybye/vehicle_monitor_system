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
    vehiclePathToDisplay: [] as any[], // 要在地图上显示的车辆路径
    // 所有曾经出现过的车辆 ID（包含已离开的车辆）。"统计分析"应包含历史车辆，
    // 而 fetchVehiclePositions 在车辆完全离开后会从结果中移除它们，所以必须额外维护这个集合。
    knownVehicleNos: [] as string[],
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
            Start: { Pos_X: 400, Pos_Y: 500 },
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
            End: { Pos_X: 200, Pos_Y: 400 }
          },
          {
            No: 'C-4',
            Name: '检查站 4',
            Position: { Pos_X: 600, Pos_Y: 300 },
            Start: { Pos_X: 600, Pos_Y: 200 },
            End: { Pos_X: 600, Pos_Y: 200 }
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
            End: { Pos_X: 400, Pos_Y: 100 }
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

        // 把当前帧出现的车牌持久化到 knownVehicleNos，避免后续车辆离开后丢失统计
        this.rememberVehicleNos(this.vehicles.map(v => v.No));

        // 车辆位置更新后，自动计算拥堵度
        this.calculatePathCongestion();
        this.triggerCongestionAlerts();
      } catch (error) {
        console.error('获取车辆位置失败:', error);
        // 如果API失败，使用本地mock数据
        this.vehicles = this.getMockVehicles();
        this.rememberVehicleNos(this.vehicles.map(v => v.No));
        this.calculatePathCongestion();
        this.triggerCongestionAlerts();
      }
    },

    // 记录"曾经出现过"的车牌，永不删除（统计分析需要包含已离开车辆的历史）
    rememberVehicleNos(nos: string[]) {
      const seen = new Set(this.knownVehicleNos);
      for (const no of nos) {
        if (no && !seen.has(no)) {
          seen.add(no);
          this.knownVehicleNos.push(no);
        }
      }
    },

    // 获取车辆详细信息
    async fetchVehicleDetail(vehicleNo: string) {
      try {
        const response = await fetch(`http://127.0.0.1:12345/getVehicleDetail?No=${vehicleNo}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        
        console.log('Raw vehicle detail response:', data);
        
        // 处理API返回的数据，确保是正确的格式
        let vehicleDetail: VehicleDetail | null = null;
        
        if (Array.isArray(data) && data.length > 0) {
          // API返回的是数组格式，取第一个元素
          vehicleDetail = data[0] as VehicleDetail;
        } else if (data && typeof data === 'object') {
          // API可能直接返回对象（虽然文档说是数组）
          vehicleDetail = data as VehicleDetail;
        }
        
        if (vehicleDetail) {
          // 确保数据格式正确，如果没有必要的字段则使用默认值
          this.vehicleDetails[vehicleNo] = {
            No: vehicleDetail.No || vehicleNo,
            EnterNo: vehicleDetail.EnterNo || 'N/A',
            EnterName: vehicleDetail.EnterName || '未知入口',
            EnterTime: vehicleDetail.EnterTime || '',
            Speed: vehicleDetail.Speed || 0,
            Position: vehicleDetail.Position || { Pos_X: 0, Pos_Y: 0 }
          };
          
          console.log('Updated vehicle details:', this.vehicleDetails[vehicleNo]);
          return this.vehicleDetails[vehicleNo];
        } else {
          console.warn(`车辆 ${vehicleNo} 的详细信息为空或格式不正确`);
          // 如果API返回空数据或格式错误，使用mock数据
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
      } catch (error) {
        console.error('获取车辆详细信息失败:', error);
        // 如果API失败，使用本地mock数据
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

    // 获取车辆历史信息 - 改进版本，获取所有页的数据
    async fetchVehiclesHistory(vehicleNo: string, page: number = 1) {
      try {
        // 由于API每页只返回5条记录，我们需要获取所有页的数据
        // 先获取第一页
        let allData: VehicleHistory[] = [];
        let currentPage = 1;
        let hasMoreData = true;
        
        while (hasMoreData) {
          const response = await fetch(`http://127.0.0.1:12345/getVehiclesHistory?No=${vehicleNo}&Page=${currentPage}`);
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          const pageData: VehicleHistory[] = await response.json();
          
          // 将当前页数据添加到总数据中
          allData = [...allData, ...pageData];
          
          // 如果当前页数据少于5条，说明已经是最后一页
          if (pageData.length < 5) {
            hasMoreData = false;
          } else {
            currentPage++;
          }
        }
        
        // 设置当前页码
        this.currentPage = page;
        this.totalHistoryPages = currentPage;
        
        // 更新历史记录
        this.historyRecords = allData;
        return allData;
      } catch (error) {
        console.error('获取车辆历史信息失败:', error);
        // 如果API失败，使用本地mock数据 - 为每辆车生成多条多样化记录，覆盖不同入口/出口/时间，
        // 这样统计、轨迹回放、过去一小时分布等能在 mock 模式下被验证
        this.historyRecords = this.getMockHistoryFor(vehicleNo);
        this.totalHistoryPages = 1;
        return this.historyRecords;
      }
    },

    // 为某辆车生成多样化的 mock 历史记录（用于无后端时演示/调试）
    getMockHistoryFor(vehicleNo: string): VehicleHistory[] {
      const entryDefs = [
        { No: 'E-N', Name: '北出入口' },
        { No: 'E-S', Name: '南出入口' },
        { No: 'E-E', Name: '东出入口' },
        { No: 'E-W', Name: '西出入口' },
      ];
      // 用车牌号哈希出每辆车的"行为"，让不同车辆的轨迹不同
      let seed = 0;
      for (let i = 0; i < vehicleNo.length; i++) seed = (seed * 31 + vehicleNo.charCodeAt(i)) & 0xffffffff;
      const rng = () => {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed / 0x7fffffff;
      };

      const recordCount = 3 + Math.floor(rng() * 4); // 3~6 条
      const records: VehicleHistory[] = [];
      const now = Date.now();
      for (let i = 0; i < recordCount; i++) {
        const enter = entryDefs[Math.floor(rng() * entryDefs.length)]!;
        // 25% 概率出入口一致（验证环绕路径）
        const exit = rng() < 0.25 ? enter : entryDefs[Math.floor(rng() * entryDefs.length)]!;
        // 时间分布在过去 90 分钟内，确保"过去一小时分布"图能看到数据
        const enterTime = now - Math.floor(rng() * 90 * 60 * 1000);
        const stayMs = Math.floor((2 + rng() * 18) * 60 * 1000); // 2~20 分钟
        const exitTime = enterTime + stayMs;
        records.push({
          VehicleNo: vehicleNo,
          EnterNo: enter.No,
          EnterName: enter.Name,
          EnterTime: `/Date(${enterTime}+0800)/`,
          ExitNo: exit.No,
          ExitName: exit.Name,
          ExitTime: `/Date(${exitTime}+0800)/`,
          Charge: Math.round((5 + rng() * 25) * 10) / 10,
          Speed: 40 + Math.floor(rng() * 80),
        });
      }
      // 按进入时间升序（与 API 描述一致）
      records.sort((a, b) => {
        const ta = parseInt(a.EnterTime.match(/\d+/)?.[0] || '0', 10);
        const tb = parseInt(b.EnterTime.match(/\d+/)?.[0] || '0', 10);
        return ta - tb;
      });
      return records;
    },

    // 获取所有车辆的历史信息（聚合所有当前 + 曾经出现过的车辆，用于统计分析）
    async fetchAllVehiclesHistory() {
      // 先确保有车辆列表
      if (this.vehicles.length === 0) {
        await this.fetchVehiclePositions();
      }
      // 关键：使用 knownVehicleNos 而不是当前 vehicles 列表，
      // 这样已离开（不在当前位置接口结果中）的车辆历史也会被纳入统计
      this.rememberVehicleNos(this.vehicles.map(v => v.No));
      const allRecords: VehicleHistory[] = [];
      const vehicleNos = this.knownVehicleNos.length > 0
        ? [...this.knownVehicleNos]
        : Array.from(new Set(this.vehicles.map(v => v.No)));
      for (const no of vehicleNos) {
        let gotData = false;
        try {
          let page = 1;
          let hasMore = true;
          while (hasMore) {
            const response = await fetch(`http://127.0.0.1:12345/getVehiclesHistory?No=${no}&Page=${page}`);
            if (!response.ok) break;
            const pageData: VehicleHistory[] = await response.json();
            if (!pageData || pageData.length === 0) break;
            allRecords.push(...pageData);
            gotData = true;
            if (pageData.length < 5) hasMore = false;
            else page++;
          }
        } catch (e) {
          console.warn(`获取车辆 ${no} 历史失败`, e);
        }
        // 后端不可用时回退到该车辆的多样化 mock 历史
        if (!gotData) {
          allRecords.push(...this.getMockHistoryFor(no));
        }
      }
      this.historyRecords = allRecords;
      return allRecords;
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

    // 按日期范围获取历史记录
    async fetchHistoryByDateRange(startDate: string, endDate: string) {
      try {
        // 由于后端没有提供按日期范围查询历史记录的API，我们需要先获取所有记录然后在前端过滤
        // 为了演示目的，我们在这里模拟一个请求，如果后端提供了API则替换下面的逻辑
        console.log(`按日期范围查询: ${startDate} 到 ${endDate}`);
        
        // 临时使用mock数据进行演示，实际应用中应该调用后端API
        // 如果后端提供了相应的API，可以替换为实际的API调用
        // const response = await fetch(`http://127.0.0.1:12345/getHistoryByDateRange?StartDate=${startDate}&EndDate=${endDate}`);
        // if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        // const data = await response.json();
        
        // 从utils导入formatDate函数
        const { formatDate } = await import('@/utils');
        
        // 将输入的时间字符串转换为Date对象
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        // 过滤现有的历史记录
        const filteredRecords = this.historyRecords.filter(record => {
          // 将时间字符串转换为Date对象进行比较
          // 首先使用formatDate转换时间，然后创建Date对象
          const formattedTime = formatDate(record.EnterTime);
          const recordDate = new Date(formattedTime);
          
          return recordDate >= start && recordDate <= end;
        });
        
        // 更新历史记录为过滤后的结果
        this.historyRecords = filteredRecords;
        return filteredRecords;
      } catch (error) {
        console.error('按日期范围获取历史记录失败:', error);
        // 如果API失败，返回现有的历史记录
        return this.historyRecords;
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
      
      // 等级边界（共享给路径与检查点）：
      //   0 辆 → 0 畅通；1-3 → 1 轻度；4-6 → 2 中度；≥7 → 3 重度
      const levelOf = (count: number): number => {
        if (count >= 7) return 3;
        if (count >= 4) return 2;
        if (count >= 1) return 1;
        return 0;
      };

      // 用户可读的端点名称映射（id 中的 token → 中文）
      const tokenToName: Record<string, string> = {
        'W': '西出入口',
        'E': '东出入口',
        'S': '南出入口',
        'N': '北出入口',
        'C-1': '检查站1',
        'C-2': '检查站2',
        'C-3': '检查站3',
        'C-4': '检查站4',
        'C-5': '检查站5',
        'C-6': '检查站6',
        'mid-left-top': '左中点',
        'mid-top-left-x': '左上中点',
        'mid-left-bottom': '左下点',
        'mid-right-bottom': '右中下点',
        'mid-right-top': '右上中点',
        'mid-top-center': '北门连接点',
      };
      const nameOf = (token: string) => tokenToName[token] || token;

      // 把同一对端点的所有 segment 聚合，作为"一条主路径"统一计数与赋级
      type Aggregate = {
        pairKey: string;
        startName: string;
        endName: string;
        firstStart: { Pos_X: number; Pos_Y: number };
        lastEnd: { Pos_X: number; Pos_Y: number };
        segments: PathInfo[];
      };
      const aggregates: Record<string, Aggregate> = {};
      allPaths.forEach(path => {
        const idBody = path.id.substring(5); // 去掉 'path:'
        const parts = idBody.split('->');
        if (parts.length !== 2) return;
        const aRaw = (parts[0] || '').split('-seg')[0]!;
        const bRaw = (parts[1] || '').split('-seg')[0]!;
        const pairKey = [aRaw, bRaw].sort().join('|');
        if (!aggregates[pairKey]) {
          aggregates[pairKey] = {
            pairKey,
            startName: nameOf(aRaw),
            endName: nameOf(bRaw),
            firstStart: path.start,
            lastEnd: path.end,
            segments: [],
          };
        }
        aggregates[pairKey]!.lastEnd = path.end;
        aggregates[pairKey]!.segments.push(path);
      });

      // 统计每对端点上的车辆数：车到任意一个 segment 的距离 < 30px 即算
      Object.values(aggregates).forEach(agg => {
        const count = this.vehicles.filter(vehicle => {
          if (vehicle.Position.Pos_X === 0 && vehicle.Position.Pos_Y === 0) return false;
          for (const seg of agg.segments) {
            const d = distanceFromPointToSegment(
              vehicle.Position.Pos_X, vehicle.Position.Pos_Y,
              seg.start.Pos_X, seg.start.Pos_Y,
              seg.end.Pos_X, seg.end.Pos_Y,
            );
            if (d < 30) return true;
          }
          return false;
        }).length;

        const level = levelOf(count);
        const aggId = `path:${agg.pairKey}`;
        const name = `${agg.startName} ↔ ${agg.endName}`;

        // 主条目：用于拥堵列表与详情显示（一对端点一条记录）
        congestion[aggId] = {
          id: aggId,
          name,
          start: agg.firstStart,
          end: agg.lastEnd,
          congestionLevel: level,
          vehicleCount: count,
        };

        // 渲染条目：地图画布按每个 segment 上色，避免直线"穿过"折点
        agg.segments.forEach((seg, idx) => {
          if (seg.id === aggId) return; // 不与主条目重复
          congestion[`${aggId}#${idx}`] = {
            id: `${aggId}#${idx}`,
            name,
            start: seg.start,
            end: seg.end,
            congestionLevel: level,
            vehicleCount: count,
          };
        });
      });

      // 检查点拥堵
      this.checkpoints.forEach(checkpoint => {
        const checkpointId = `checkpoint-${checkpoint.No}`;
        const count = this.vehicles.filter(vehicle => {
          if (vehicle.Position.Pos_X === 0 && vehicle.Position.Pos_Y === 0) return false;
          const dx = vehicle.Position.Pos_X - checkpoint.Position.Pos_X;
          const dy = vehicle.Position.Pos_Y - checkpoint.Position.Pos_Y;
          return Math.sqrt(dx * dx + dy * dy) < 50;
        }).length;

        congestion[checkpointId] = {
          id: checkpointId,
          name: checkpoint.Name,
          start: checkpoint.Position,
          end: checkpoint.Position,
          congestionLevel: levelOf(count),
          vehicleCount: count,
        };
      });

      this.pathCongestion = congestion;
      return congestion;
    },



    // 触发拥挤预警
    triggerCongestionAlerts() {
      const alerts: Record<string, boolean> = {};
      Object.entries(this.pathCongestion).forEach(([pathId, pathSegment]) => {
        // 跳过仅用于地图渲染的子段（如 path:xxx#0），避免预警列表重复
        if (pathId.includes('#')) return;
        alerts[pathId] = pathSegment.congestionLevel >= 3;
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
    },
    
    // 获取车辆轨迹用于回放
    // 如果传入 record，则基于这条具体记录构建轨迹（修复"永远只显示第一条"的问题）；
    // 否则获取车辆历史并使用首条记录。
    async getVehiclePathForPlayback(vehicleNo: string, record?: VehicleHistory) {
      try {
        let targetRecord: VehicleHistory | undefined = record;

        if (!targetRecord) {
          // 没有指定记录：尝试从已加载的历史中找一条该车辆的记录
          targetRecord = this.historyRecords.find(r => r.VehicleNo === vehicleNo);
        }

        if (!targetRecord) {
          // 仍然没有：拉取该车辆的历史
          await this.fetchVehiclesHistory(vehicleNo, 1);
          targetRecord = this.historyRecords.find(r => r.VehicleNo === vehicleNo);
        }

        if (!targetRecord) {
          // 历史为空：尝试以当前位置生成单点轨迹
          await this.fetchVehiclePositions();
          const currentVehicle = this.vehicles.find(v => v.No === vehicleNo);
          if (currentVehicle && (currentVehicle.Position.Pos_X !== 0 || currentVehicle.Position.Pos_Y !== 0)) {
            return [{
              id: `${vehicleNo}-current`,
              vehicleNo: vehicleNo,
              time: new Date().toISOString(),
              position: currentVehicle.Position,
              speed: 0,
              enterName: '当前位置',
              exitName: ''
            }];
          }
          return [];
        }

        const enterName = targetRecord.EnterName || '未知入口';
        const exitName = targetRecord.ExitName || enterName;

        let realPath;
        if (enterName === exitName) {
          realPath = this.createCircularPath(enterName);
        } else {
          realPath = this.buildRealisticPath(enterName, exitName);
        }

        const pathData = [];
        for (let j = 0; j < realPath.length; j++) {
          const point = realPath[j];
          if (!point) continue;
          pathData.push({
            id: `${targetRecord.VehicleNo}-path-${j}`,
            vehicleNo: targetRecord.VehicleNo || vehicleNo,
            time: targetRecord.EnterTime || new Date().toISOString(),
            position: { Pos_X: point.x, Pos_Y: point.y },
            speed: targetRecord.Speed || 0,
            enterName,
            exitName,
          });
        }

        return pathData;
      } catch (error) {
        console.error('获取车辆轨迹失败:', error);
        return [];
      }
    },
    
    // 构建最短路径 - 使用Dijkstra算法
    buildRealisticPath(startLocation: string, endLocation: string) {
      // 定义所有节点及其坐标（根据地图布局）
      const nodes: Record<string, {x: number, y: number}> = {
        '西出入口': {x: 0, y: 400},
        '东出入口': {x: 800, y: 200},
        '南出入口': {x: 200, y: 0},
        '北出入口': {x: 400, y: 600},
        '检查站 1': {x: 300, y: 500},
        '检查站 2': {x: 500, y: 500},
        '检查站 3': {x: 200, y: 300},
        '检查站 4': {x: 600, y: 300},
        '检查站 5': {x: 300, y: 100},
        '检查站 6': {x: 600, y: 100},
        '中间点-左中上': {x: 200, y: 500},
        '中间点-左中': {x: 200, y: 400},
        '中间点-左下': {x: 200, y: 100},
        '中间点-右中上': {x: 600, y: 500},
        '中间点-右中': {x: 600, y: 200},
        '中间点-中下': {x: 400, y: 100},
        '中间点-顶部': {x: 400, y: 500}
      };
      
      // 如果起点和终点相同，返回单个点
      if (startLocation === endLocation) {
        const pos = nodes[startLocation] || {x: 0, y: 0};
        return [{x: pos.x, y: pos.y}];
      }
      
      // 道路网络 - 与 MapCanvas.vue / calculatePathCongestion 中的实际道路一致
      // 每个节点的邻接表合并到一处，避免对象字面量重复键覆盖
      const roadNetwork: Record<string, string[]> = {
        // 西出入口 ↔ 中间点-左中（双向）
        '西出入口': ['中间点-左中'],

        // 中间点-左中：可回西出入口；单向去 检查站 3
        '中间点-左中': ['西出入口', '检查站 3'],

        // 检查站 1：上行去 北出入口（双向）；下行经 中间点-左中上 进入西侧环
        '检查站 1': ['中间点-左中上', '北出入口'],

        // 中间点-左中上 → 中间点-左中（单向）
        '中间点-左中上': ['中间点-左中'],

        // 检查站 3 → 中间点-左下（单向）
        '检查站 3': ['中间点-左下'],

        // 南出入口 ↔ 中间点-左下（双向）
        '南出入口': ['中间点-左下'],
        '中间点-左下': ['南出入口', '检查站 5'],

        // 底部水平路径
        '检查站 5': ['中间点-中下'],
        '中间点-中下': ['检查站 6'],

        // 检查站 6 → 中间点-右中
        '检查站 6': ['中间点-右中'],

        // 东出入口 ↔ 中间点-右中（双向）；中间点-右中 → 检查站 4
        '东出入口': ['中间点-右中'],
        '中间点-右中': ['东出入口', '检查站 4'],

        // 检查站 4 → 中间点-右中上
        '检查站 4': ['中间点-右中上'],

        // 中间点-右中上 → 检查站 2
        '中间点-右中上': ['检查站 2'],

        // 检查站 2 → 中间点-顶部
        '检查站 2': ['中间点-顶部'],

        // 北出入口 ↔ 中间点-顶部（双向）；中间点-顶部 → 检查站 1
        '北出入口': ['中间点-顶部'],
        '中间点-顶部': ['北出入口', '检查站 1'],
      };
      
      // Dijkstra算法找最短路径
      const shortestPath = this.dijkstra(roadNetwork, nodes, startLocation, endLocation);
      
      if (shortestPath.length === 0) {
        // 如果找不到路径，使用直线连接作为备用
        const startPos = nodes[startLocation] || {x: 0, y: 0};
        const endPos = nodes[endLocation] || {x: 0, y: 0};
        return this.createStraightPath(startPos, endPos);
      }
      
      // 将路径节点转换为连续的坐标点（添加中间插值点）
      return this.interpolatePath(shortestPath, nodes);
    },
    
    // Dijkstra算法实现
    dijkstra(network: Record<string, string[]>, nodes: Record<string, {x: number, y: number}>, start: string, end: string): string[] {
      // 距离映射
      const distances: Record<string, number> = {};
      // 前驱节点映射
      const previous: Record<string, string | null> = {};
      // 未访问节点集合
      const unvisited = new Set<string>();
      
      // 初始化
      for (const node of Object.keys(nodes)) {
        distances[node] = node === start ? 0 : Infinity;
        previous[node] = null;
        unvisited.add(node);
      }
      
      while (unvisited.size > 0) {
        // 找到距离最小的未访问节点
        let current = '';
        let minDist = Infinity;
        for (const node of unvisited) {
          const dist = distances[node];
          if (dist !== undefined && dist < minDist) {
            minDist = dist;
            current = node;
          }
        }
        
        if (!current || distances[current] === Infinity) break;
        
        // 如果到达终点，退出循环
        if (current === end) break;
        
        unvisited.delete(current);
        
        // 更新邻居节点的距离
        const neighbors = network[current] || [];
        for (const neighbor of neighbors) {
          if (!unvisited.has(neighbor)) continue;
          
          const currentPos = nodes[current];
          const neighborPos = nodes[neighbor];
          
          if (!currentPos || !neighborPos) continue;
          
          const distance = this.calculateDistance(currentPos, neighborPos);
          const currentDist = distances[current];
          if (currentDist === undefined) continue;
          
          const newDist = currentDist + distance;
          const neighborDist = distances[neighbor];
          if (neighborDist === undefined || newDist < neighborDist) {
            distances[neighbor] = newDist;
            previous[neighbor] = current;
          }
        }
      }
      
      // 回溯路径
      const path: string[] = [];
      let current = end;
      while (current && previous[current] !== null) {
        path.unshift(current);
        const prev = previous[current];
        if (prev === null || prev === undefined) break;
        current = prev;
      }
      
      if (path.length > 0 && start) {
        path.unshift(start);
      } else if (start === end && start) {
        path.push(start);
      }
      
      return path;
    },
    
    // 计算两点之间的距离
    calculateDistance(pos1: {x: number, y: number}, pos2: {x: number, y: number}): number {
      const dx = pos2.x - pos1.x;
      const dy = pos2.y - pos1.y;
      return Math.sqrt(dx * dx + dy * dy);
    },
    
    // 创建直线路径（备用）
    createStraightPath(start: {x: number, y: number}, end: {x: number, y: number}): {x: number, y: number}[] {
      const path: {x: number, y: number}[] = [];
      const numPoints = 10;
      for (let i = 0; i <= numPoints; i++) {
        const t = i / numPoints;
        path.push({
          x: start.x + (end.x - start.x) * t,
          y: start.y + (end.y - start.y) * t
        });
      }
      return path;
    },
    
    // 在路径节点之间插入插值点，使路径更平滑
    interpolatePath(nodePath: string[], nodes: Record<string, {x: number, y: number}>): {x: number, y: number}[] {
      const path: {x: number, y: number}[] = [];
      
      for (let i = 0; i < nodePath.length - 1; i++) {
        const currentNodeKey = nodePath[i];
        const nextNodeKey = nodePath[i + 1];
        
        if (!currentNodeKey || !nextNodeKey) continue;
        
        const currentNode = nodes[currentNodeKey];
        const nextNode = nodes[nextNodeKey];
        
        if (!currentNode || !nextNode) continue;
        
        // 计算两点之间需要插入的点数（根据距离决定）
        const distance = this.calculateDistance(currentNode, nextNode);
        const numPoints = Math.max(3, Math.ceil(distance / 50));
        
        for (let j = 0; j < numPoints; j++) {
          const t = j / (numPoints - 1);
          path.push({
            x: currentNode.x + (nextNode.x - currentNode.x) * t,
            y: currentNode.y + (nextNode.y - currentNode.y) * t
          });
        }
      }
      
      // 添加最后一个节点
      if (nodePath.length > 0) {
        const lastNodeKey = nodePath[nodePath.length - 1];
        if (lastNodeKey) {
          const lastNode = nodes[lastNodeKey];
          if (lastNode) {
            path.push({x: lastNode.x, y: lastNode.y});
          }
        }
      }
      
      return path;
    },
    
    // 创建环绕路径（当出入口一致时使用）
    // 在与 buildRealisticPath 相同的有向道路图上，找一条经过"所有检查站"再回到起点的闭合路径
    // （不允许直接折返：必须遍历检查站 1~6 再回起点）
    createCircularPath(locationName: string): {x: number, y: number}[] {
      const nodes: Record<string, {x: number, y: number}> = {
        '西出入口': {x: 0, y: 400},
        '东出入口': {x: 800, y: 200},
        '南出入口': {x: 200, y: 0},
        '北出入口': {x: 400, y: 600},
        '检查站 1': {x: 300, y: 500},
        '检查站 2': {x: 500, y: 500},
        '检查站 3': {x: 200, y: 300},
        '检查站 4': {x: 600, y: 300},
        '检查站 5': {x: 300, y: 100},
        '检查站 6': {x: 600, y: 100},
        '中间点-左中上': {x: 200, y: 500},
        '中间点-左中': {x: 200, y: 400},
        '中间点-左下': {x: 200, y: 100},
        '中间点-右中上': {x: 600, y: 500},
        '中间点-右中': {x: 600, y: 200},
        '中间点-中下': {x: 400, y: 100},
        '中间点-顶部': {x: 400, y: 500},
      };

      const roadNetwork: Record<string, string[]> = {
        '西出入口': ['中间点-左中'],
        '中间点-左中': ['西出入口', '检查站 3'],
        '检查站 1': ['中间点-左中上', '北出入口'],
        '中间点-左中上': ['中间点-左中'],
        '检查站 3': ['中间点-左下'],
        '南出入口': ['中间点-左下'],
        '中间点-左下': ['南出入口', '检查站 5'],
        '检查站 5': ['中间点-中下'],
        '中间点-中下': ['检查站 6'],
        '检查站 6': ['中间点-右中'],
        '东出入口': ['中间点-右中'],
        '中间点-右中': ['东出入口', '检查站 4'],
        '检查站 4': ['中间点-右中上'],
        '中间点-右中上': ['检查站 2'],
        '检查站 2': ['中间点-顶部'],
        '北出入口': ['中间点-顶部'],
        '中间点-顶部': ['北出入口', '检查站 1'],
      };

      // 起点不在图上：返回单点
      if (!nodes[locationName] || !roadNetwork[locationName]) {
        const pos = nodes[locationName];
        return pos ? [{ x: pos.x, y: pos.y }] : [];
      }

      // 6 个检查站，全部访问后才能回到起点
      const checkpointList = ['检查站 1', '检查站 2', '检查站 3', '检查站 4', '检查站 5', '检查站 6'];
      const checkpointIndex: Record<string, number> = {};
      checkpointList.forEach((c, i) => { checkpointIndex[c] = i; });
      const fullMask = (1 << checkpointList.length) - 1;

      // BFS over (node, visitedMask, left) — 找最短经过所有检查站的回路
      type Crumb = { prevKey: string | null; node: string };
      const visited = new Map<string, Crumb>();
      const startMask = checkpointIndex[locationName] !== undefined
        ? (1 << checkpointIndex[locationName]!)
        : 0;
      const startKey = `${locationName}|${startMask}|0`;
      visited.set(startKey, { prevKey: null, node: locationName });
      const queue: Array<{ node: string; mask: number; left: number; key: string }> = [
        { node: locationName, mask: startMask, left: 0, key: startKey },
      ];

      let foundKey: string | null = null;
      while (queue.length) {
        const cur = queue.shift()!;
        const neighbors = roadNetwork[cur.node] || [];
        for (const nb of neighbors) {
          const nextLeft = cur.left || nb !== locationName ? 1 : 0;
          const nextMask = checkpointIndex[nb] !== undefined
            ? cur.mask | (1 << checkpointIndex[nb]!)
            : cur.mask;
          if (nb === locationName && cur.left && cur.mask === fullMask) {
            const key = `${nb}|${nextMask}|done`;
            if (!visited.has(key)) {
              visited.set(key, { prevKey: cur.key, node: nb });
              foundKey = key;
            }
            break;
          }
          const key = `${nb}|${nextMask}|${nextLeft}`;
          if (!visited.has(key)) {
            visited.set(key, { prevKey: cur.key, node: nb });
            queue.push({ node: nb, mask: nextMask, left: nextLeft, key });
          }
        }
        if (foundKey) break;
      }

      // 回溯回路
      const route: string[] = [];
      if (foundKey) {
        let key: string | null = foundKey;
        while (key) {
          const crumb = visited.get(key);
          if (!crumb) break;
          route.push(crumb.node);
          key = crumb.prevKey;
        }
        route.reverse();
      } else {
        // 没找到（理论不会发生），退化为返回单点
        route.push(locationName);
      }

      // 用与 interpolatePath 相同的密度插值，保证画布上是连续折线
      const path: {x: number, y: number}[] = [];
      for (let i = 0; i < route.length - 1; i++) {
        const a = nodes[route[i]!];
        const b = nodes[route[i + 1]!];
        if (!a || !b) continue;
        const distance = this.calculateDistance(a, b);
        const numPoints = Math.max(3, Math.ceil(distance / 50));
        for (let j = 0; j < numPoints; j++) {
          const t = j / (numPoints - 1);
          path.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
        }
      }
      const last = nodes[route[route.length - 1]!];
      if (last) path.push({ x: last.x, y: last.y });
      return path;
    },
    
    // 给定一对入口/出口名（含一致的"环绕"情形），返回路径上途经的检查站列表（去重，按访问顺序）
    // 用于"累计经过检查点"统计：从历史记录派生而非依赖实时位置轮询
    getCheckpointsAlongRoute(enterName: string, exitName: string): string[] {
      const nodes: Record<string, {x: number, y: number}> = {
        '西出入口': {x: 0, y: 400},
        '东出入口': {x: 800, y: 200},
        '南出入口': {x: 200, y: 0},
        '北出入口': {x: 400, y: 600},
        '检查站 1': {x: 300, y: 500},
        '检查站 2': {x: 500, y: 500},
        '检查站 3': {x: 200, y: 300},
        '检查站 4': {x: 600, y: 300},
        '检查站 5': {x: 300, y: 100},
        '检查站 6': {x: 600, y: 100},
        '中间点-左中上': {x: 200, y: 500},
        '中间点-左中': {x: 200, y: 400},
        '中间点-左下': {x: 200, y: 100},
        '中间点-右中上': {x: 600, y: 500},
        '中间点-右中': {x: 600, y: 200},
        '中间点-中下': {x: 400, y: 100},
        '中间点-顶部': {x: 400, y: 500},
      };
      const roadNetwork: Record<string, string[]> = {
        '西出入口': ['中间点-左中'],
        '中间点-左中': ['西出入口', '检查站 3'],
        '检查站 1': ['中间点-左中上', '北出入口'],
        '中间点-左中上': ['中间点-左中'],
        '检查站 3': ['中间点-左下'],
        '南出入口': ['中间点-左下'],
        '中间点-左下': ['南出入口', '检查站 5'],
        '检查站 5': ['中间点-中下'],
        '中间点-中下': ['检查站 6'],
        '检查站 6': ['中间点-右中'],
        '东出入口': ['中间点-右中'],
        '中间点-右中': ['东出入口', '检查站 4'],
        '检查站 4': ['中间点-右中上'],
        '中间点-右中上': ['检查站 2'],
        '检查站 2': ['中间点-顶部'],
        '北出入口': ['中间点-顶部'],
        '中间点-顶部': ['北出入口', '检查站 1'],
      };
      const isCheckpoint = (n: string) => /^检查站 \d$/.test(n);

      // 出入口一致：与 createCircularPath 同样的"经过全部检查站再回起点"BFS
      if (enterName === exitName) {
        if (!nodes[enterName] || !roadNetwork[enterName]) return [];
        const list = ['检查站 1', '检查站 2', '检查站 3', '检查站 4', '检查站 5', '检查站 6'];
        const idx: Record<string, number> = {};
        list.forEach((c, i) => { idx[c] = i; });
        const fullMask = (1 << list.length) - 1;
        const visited = new Map<string, { prevKey: string | null; node: string }>();
        const startMask = idx[enterName] !== undefined ? (1 << idx[enterName]!) : 0;
        const startKey = `${enterName}|${startMask}|0`;
        visited.set(startKey, { prevKey: null, node: enterName });
        const queue: Array<{ node: string; mask: number; left: number; key: string }> = [
          { node: enterName, mask: startMask, left: 0, key: startKey },
        ];
        let foundKey: string | null = null;
        while (queue.length) {
          const cur = queue.shift()!;
          for (const nb of roadNetwork[cur.node] || []) {
            const nextLeft = cur.left || nb !== enterName ? 1 : 0;
            const nextMask = idx[nb] !== undefined ? cur.mask | (1 << idx[nb]!) : cur.mask;
            if (nb === enterName && cur.left && cur.mask === fullMask) {
              const k = `${nb}|${nextMask}|done`;
              if (!visited.has(k)) { visited.set(k, { prevKey: cur.key, node: nb }); foundKey = k; }
              break;
            }
            const k = `${nb}|${nextMask}|${nextLeft}`;
            if (!visited.has(k)) {
              visited.set(k, { prevKey: cur.key, node: nb });
              queue.push({ node: nb, mask: nextMask, left: nextLeft, key: k });
            }
          }
          if (foundKey) break;
        }
        const route: string[] = [];
        if (foundKey) {
          let key: string | null = foundKey;
          while (key) {
            const c = visited.get(key); if (!c) break;
            route.push(c.node); key = c.prevKey;
          }
          route.reverse();
        }
        return route.filter(isCheckpoint);
      }

      // 出入口不同：复用 dijkstra
      const route = this.dijkstra(roadNetwork, nodes, enterName, exitName);
      return route.filter(isCheckpoint);
    },

    // 根据位置名称获取坐标
    getCoordinatesForLocation(locationName: string) {
      // 预定义的位置坐标
      const locationCoords: Record<string, { Pos_X: number, Pos_Y: number }> = {
        '西出入口': { Pos_X: 0, Pos_Y: 400 },
        '东出入口': { Pos_X: 800, Pos_Y: 200 },
        '南出入口': { Pos_X: 200, Pos_Y: 0 },
        '北出入口': { Pos_X: 400, Pos_Y: 600 },
        '检查站 1': { Pos_X: 300, Pos_Y: 500 },
        '检查站 2': { Pos_X: 500, Pos_Y: 500 },
        '检查站 3': { Pos_X: 200, Pos_Y: 300 },
        '检查站 4': { Pos_X: 600, Pos_Y: 300 },
        '检查站 5': { Pos_X: 300, Pos_Y: 100 },
        '检查站 6': { Pos_X: 600, Pos_Y: 100 },
        // 添加更多可能的地点
        '中间点-左上': { Pos_X: 200, Pos_Y: 400 },
        '中间点-左中上': { Pos_X: 200, Pos_Y: 500 },
        '中间点-左下': { Pos_X: 200, Pos_Y: 100 },
        '中间点-右下': { Pos_X: 600, Pos_Y: 200 },
        '中间点-底部中间': { Pos_X: 400, Pos_Y: 100 },
        '中间点-底部中间右': { Pos_X: 500, Pos_Y: 100 }
      };
      
      return locationCoords[locationName] || { Pos_X: 0, Pos_Y: 0 };
    },
    
    // 设置要在地图上显示的车辆路径
    setVehiclePathToDisplay(pathData: any[]) {
      this.vehiclePathToDisplay = pathData;
    }
  }
});