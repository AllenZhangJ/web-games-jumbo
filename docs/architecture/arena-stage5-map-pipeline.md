# Arena Stage 5 地图权威执行管线

## 目的

本文档定义 [ADR-008](../decisions/008-arena-map-authority-timeline.md) 的可执行合同。地图是玩法真相；Three.js Mesh、预警动画和特效只是对权威状态的可视化。

## 模块边界

```text
ArenaV1AuthorityContent
     ├── ActionRegistry
     ├── EquipmentRegistry
     └── MapRegistry
              ↓
MapDefinition（由 MapRegistry 选择）
              ↓
MapTimeline + EventStrategyRegistry
              ↓
MapRuntime ← MapSerializer
              ↓
ArenaMapSystem → MapCommandRegistry
              ↓
MatchCore ports → Physics / EquipmentSystem
              ↓
public MatchSnapshot / delayed BotObservation / Renderer
```

- Definition 不包含函数、Mesh、物理对象或墙钟。
- Arena V1 配置选择、RuleEngine 和 MapSystem 共享同一个内容目录；地图引用的装备必须由实际注入的 RuleEngine catalog 在构造期确认。
- 新增地图只向 `content/arena-v1-maps.js` 注册 Definition，配置与 MapSystem 不按具体地图 ID 分支。
- Strategy 只把数据和 occurrence seed 转为不可变计划、命令和事件。
- 风场、塌陷和装备波各自拥有独立 Strategy 文件；默认 Registry 只负责组合，安全拓扑校验独立于事件执行。
- Runtime 只写 surface/occurrence 状态，不写物理或装备。
- MatchCore port 是唯一跨系统提交点。

## 固定 Tick 顺序

在 RUNNING/SUDDEN_DEATH 的每个 tick：

1. 推进参赛者、装备冷却和动作计时器。
2. `ArenaMapSystem.advance(activeTick, actors)` 按 warning → end → start 顺序计算转换，再计算当前 active event 的 tick 命令。
3. `ArenaMapSystem.commit()` 通过 port 提交风力、surface 开关和装备生成。每次 `advance()` 只能原批次、按顺序、恰好提交一次；未提交前禁止推进下一 tick。
4. MatchCore 发布地图事件，并回收位于已失效 surface 的无主装备。
5. EquipmentSystem 解析拾取，RuleEngine 解析动作、命中与冲量。
6. 提交移动意图并推进物理，再处理掉落、重生和胜负。
7. 产生公开快照、内部 hash 快照与回放 checkpoint。

地图命令在拾取前提交，所以同 tick 新生成的装备可按普通自动拾取规则被获得；已塌陷点不会参与拾取。

## 公开与内部快照

| 字段 | 公开 Snapshot/Bot | 内部 Hash |
|---|---|---|
| surface enabled/revision | 是 | 是 |
| occurrence phase/ticks | 是 | 是 |
| public warning payload | 是 | 是 |
| future equipment identity/private plan | 否 | 是 |
| MapDefinition/Registry/handler | 否 | 否，Definition 与显式 ruleset 兼容版本进入 content hash |

`MapSerializer` 是 MatchCore 和 Bot 共用的 schema 边界，拒绝未知字段、重复 ID、非有限数、非法阶段和时间顺序。

## Stage 5 首图时间表

| 机制 | 预警 | 生效 |
|---|---:|---:|
| 向东风场 | 提前 2 秒 | 10–18、50–58、90–98 秒 |
| 向西风场 | 提前 2 秒 | 30–38、70–78、110–118 秒 |
| 装备波 | 提前 3 秒 | 30、60、90、120 秒 |
| 四角塌陷 | 提前 3 秒 | 60 秒 |
| 南北塌陷 | 提前 3 秒 | 90 秒 |
| 东西塌陷 | 提前 3 秒 | 110 秒 |

中心 surface 永不塌陷，两个重生点与一个装备点始终可用。平衡数值可以版本化调整，但预警、公平信息边界和永久安全岛不能由表现层覆盖。

## 失败与生命周期

- 输入或 batch 合同失败且尚未写入时，拒绝本次调用并保持可用。
- CommandRegistry 在调用任一 mutation port 前校验完整批次，避免“前半批已写、后半批才发现字段错误”。
- 时间轴已推进或 port 提交失败时，MapSystem/MatchCore fail closed，不在半提交状态上继续。
- 构造 Rule、Map 或 Physics 任一失败时，MatchCore 回收已创建资源并保留原始与清理错误原因。
- `destroy()` 幂等；权威变更期间明确拒绝重入或销毁。

## Bot 地图边界

- Bot 只读取经过难度延迟的公开 MapSnapshot，不读取 `privatePlan` 或未来 occurrence。
- `bot-map-navigation` 独立负责 surface 查询、连通路径、真实边缘和危险目标；`bot-goals` 只计算 Utility 与计划语义。
- 动态寻路只经过公开为 enabled 且未处于已公开塌陷预警的 surface。
- 边缘距离按角色所在横纵截面的 surface 并集计算，不能用连通块外接矩形；十字形地图的缺角仍是深渊。
- 步行连通使用 BotArenaView 中与地图拓扑校验一致的 `maximumStepHeight`，不在策略中复制魔法数。
