## 1. 获取出入口信息

- **接口地址**：`http://127.0.0.1:12345/getEntries`
- **请求方式**：GET
- **返回字段**：
    - `No`：编号
    - `Name`：名称
    - `Position`：当前位置坐标
        - `Pos_X`：X 坐标
        - `Pos_Y`：Y 坐标
    - `Start`：起始坐标
        - `Pos_X`：X 坐标
        - `Pos_Y`：Y 坐标
    - `End`：结束坐标
        - `Pos_X`：X 坐标
        - `Pos_Y`：Y 坐标
- **返回示例**：

[  
  {  
    "No":"E-E",  
    "Name":"东出入口",  
    "Position": {"Pos_X":800, "Pos_Y":200},  
    "Start": {"Pos_X":600, "Pos_Y":200},  
    "End": {"Pos_X":800, "Pos_Y":200}  
  },  
  {  
    "No":"E-S",  
    "Name":"南出入口",  
    "Position": {"Pos_X":200, "Pos_Y":0},  
    "Start": {"Pos_X":200, "Pos_Y":0},  
    "End": {"Pos_X":200, "Pos_Y":100}  
  }  
]

---

## 2. 获取检查点信息

- **接口地址**：`http://127.0.0.1:12345/getCheckpoints`
- **请求方式**：GET
- **返回字段**：
    - `No`：编号
    - `Name`：名称
    - `Position`：当前位置坐标
        - `Pos_X`
        - `Pos_Y`
    - `Start`：起始坐标
        - `Pos_X`
        - `Pos_Y`
    - `End`：结束坐标
        - `Pos_X`
        - `Pos_Y`
- **返回示例**：

[  
  {  
    "No":"C-1",  
    "Name":"检查站 1",  
    "Position": {"Pos_X":300, "Pos_Y":500},  
    "Start": {"Pos_X":200, "Pos_Y":400},  
    "End": {"Pos_X":400, "Pos_Y":500}  
  },  
  {  
    "No":"C-2",  
    "Name":"检查站 2",  
    "Position": {"Pos_X":500, "Pos_Y":500},  
    "Start": {"Pos_X":400, "Pos_Y":500},  
    "End": {"Pos_X":600, "Pos_Y":500}  
  }  
]

---

## 3. 获取车辆实时位置

- **接口地址**：`http://127.0.0.1:12345/getVehiclePositions`
- **请求方式**：GET
- **返回字段**：
    - `No`：车牌号
    - `Position`：当前位置
        - `Pos_X`
        - `Pos_Y`
    - **说明**：`Pos_X` 和 `Pos_Y` 均为 0 时表示车辆已离开区域
- **返回示例**：

[  
  {  
    "No":"V-2",  
    "Position": {"Pos_X":200, "Pos_Y":112}  
  },  
  {  
    "No":"V-3",  
    "Position": {"Pos_X":0, "Pos_Y":0}  
  }  
]

---

## 4. 获取车辆详细信息

- **接口地址**：`http://127.0.0.1:12345/getVehicleDetail?No={车牌号}`
- **请求方式**：GET
- **请求示例**：

http://127.0.0.1:12345/getVehicleDetail?No=V-1

- **返回字段**：
    - `No`：车牌号
    - `EnterNo`：入口编号
    - `EnterName`：入口名称
    - `EnterTime`：进入时间（时间戳格式）
    - `Speed`：车速
    - `Position`：当前位置
        - `Pos_X`
        - `Pos_Y`
- **返回示例**：

[  
  {  
    "No":"V-1",  
    "EnterNo":"E-W",  
    "EnterName":"西出入口",  
    "EnterTime":"\\/Date(1756871452790+0800)\\/",  
    "Speed":83,  
    "Position": {"Pos_X":200, "Pos_Y":112}  
  }  
]

---

## 5. 获取车辆历史信息

- **接口地址**：`http://127.0.0.1:12345/getVehiclesHistory?No={车牌号}&Page={页码}`
- **请求方式**：GET
- **说明**：
    - `Page` 从 1 开始，每页 5 条记录
    - 默认按进入区域时间升序排列
- **返回字段**：
    - `VehicleNo`：车牌号
    - `EnterNo`：入口编号
    - `EnterName`：入口名称
    - `EnterTime`：进入时间
    - `ExitNo`：出口编号
    - `ExitName`：出口名称
    - `ExitTime`：离开时间
    - `Charge`：费用
    - `Speed`：车速
- **返回示例**：

[  
  {  
    "VehicleNo":"V-1",  
    "EnterNo":"E-N",  
    "EnterName":"北出入口",  
    "EnterTime":"\\/Date(1756871452790+0800)\\/",  
    "ExitNo":"E-E",  
    "ExitName":"东出入口",  
    "ExitTime":"\\/Date(1756871452790+0800)\\/",  
    "Charge":10,  
    "Speed":115  
  }  
]

---

## 6. 汇总车辆费用

- **接口地址**：`http://127.0.0.1:12345/getStatisticsByVehicle?No={车牌号}`
- **请求方式**：GET
- **返回字段**：
    - 单个数字，表示该车辆的累计费用
- **返回示例**：

612.1

---

## 7. 汇总通行车辆总数（按出入口）

- **接口地址**：`http://127.0.0.1:12345/getStatisticsByEntry?No={出入口编号}`
- **请求方式**：GET
- **返回字段**：
    - `Enter`：进入车辆数
    - `Exit`：离开车辆数
- **返回示例**：

{  
  "Enter":15,  
  "Exit":20  
}

---

### ✅ 注意事项

1. 模拟服务端持续监听 `http://127.0.0.1:12345`。
2. 所有数据均以 **JSON UTF-8** 格式返回。
3. 车辆状态：
    - `Pos_X=0` && `Pos_Y=0` → 车辆已离开区域
4. 调用历史数据接口时，注意分页参数 `Page` 从 1 开始。