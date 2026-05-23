// 时间处理相关工具函数
export const formatDate = (dateString: string): string => {
  // 将.NET日期格式转换为可读格式
  if (dateString.includes('/Date(')) {
    const timestamp = parseInt(dateString.replace(/\/Date\((\d+)\+\d+\)\//, '$1'));
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN');
  }
  return dateString;
};

// 车辆位置插值函数，用于平滑移动
export const interpolatePosition = (
  startPos: { Pos_X: number; Pos_Y: number },
  endPos: { Pos_X: number; Pos_Y: number },
  progress: number
): { Pos_X: number; Pos_Y: number } => {
  return {
    Pos_X: startPos.Pos_X + (endPos.Pos_X - startPos.Pos_X) * progress,
    Pos_Y: startPos.Pos_Y + (endPos.Pos_Y - startPos.Pos_Y) * progress
  };
};

// 计算两点之间的距离
export const calculateDistance = (
  pos1: { Pos_X: number; Pos_Y: number },
  pos2: { Pos_X: number; Pos_Y: number }
): number => {
  return Math.sqrt(Math.pow(pos2.Pos_X - pos1.Pos_X, 2) + Math.pow(pos2.Pos_Y - pos1.Pos_Y, 2));
};

// 防抖函数
export const debounce = <T extends (...args: any[]) => any>(func: T, wait: number) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>): void => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// 节流函数
export const throttle = <T extends (...args: any[]) => any>(func: T, limit: number) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>): void => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// 将数据导出为CSV格式
export const exportToCSV = (data: any[], filename: string) => {
  if (data.length === 0) return;

  // 获取表头
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(header => `"${row[header] ?? ''}"`).join(','))
  ].join('\n');

  // 创建下载链接
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// 将数据导出为JSON格式
export const exportToJSON = (data: any, filename: string) => {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// 深拷贝对象
export const deepClone = <T>(obj: T): T => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as any;
  if (Array.isArray(obj)) return obj.map(item => deepClone(item)) as any;
  const clonedObj = {} as T;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      clonedObj[key] = deepClone(obj[key]);
    }
  }
  return clonedObj;
};

// 生成随机颜色
export const generateRandomColor = (): string => {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};