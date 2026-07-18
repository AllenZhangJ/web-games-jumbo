# Arena V1 架构提案

## 文档状态

已接受整体边界；阶段 1～5 已分别落地轻量街机物理、无渲染 MatchCore、隐藏机器人、本地快速匹配、数据驱动装备 Rule/Core 和地图权威时间轴。Stage 6 的 Character/Input/Replay、Movement、Bot 同权移动、三端输入、灰盒、HUD、Session、盲测工作台与五目标 E3 证据合同已建立，但真实新手 E4 和目标设备 E3 Record 未完成。Stage 7 S7.1 已落地版本化表现/资产/动画/六方向合同，正式 GLB 与动画尚未生产。Stage 8 S8.1～S8.5.5 已形成 Profile、产品状态机、奖励/解锁、对称内容池、Product Presentation 与三端默认产品入口，S8.5.6 六目标证据合同已建立但外部 Record 未采集。Stage 9 S9.1～S9.2 已落地实验、黄金回放和回归门；S9.3a 已保留首份失败候选，S9.3b 的 11 条命候选已通过独立 900 局 validation，待提升为 Product 默认。核心决策见 ADR-005～ADR-023。

本文同时记录已落地边界与后续目标；未明确标记为已落地的模块仍不是当前能力。Stage 6、Stage 7 S7.1 与 Stage 8 S8.5.6 外部验收仍在执行；Stage 9 S9.1～S9.3a 与首份 baseline 已完成，S9.3b 新候选、真人公平性与性能冻结仍未完成。分别见 [Stage 6](arena-stage6-input-movement-plan.md)、[Stage 7](arena-stage7-presentation-plan.md)、[Stage 8](arena-stage8-product-progression-plan.md)、[Stage 9](arena-stage9-convergence-plan.md) 和 [Stage 4～9 项目方决策门](arena-stage4-9-decision-gates.md)。当前 v3 架构仍见 [`../architecture.md`](../architecture.md)。

## 目标

- 复用现有 Web、微信、抖音 Platform Contract、单 WebGL2 Canvas 和 Three.js 表现层基础。
- 将单人数字跳台 Core 替换或旁路为独立的 Arena MatchCore。
- 支持一名玩家和一名隐藏本地机器人，固定 1v1。
- 保持固定步长、确定性 RNG、可回放输入和 Core → Renderer 单向数据流。
- 第一版本不引入网络、服务器、账号或数据库依赖。

## 总体链路

```text
快速匹配外壳 ─► match seed ─► 隐藏对手形象 + 难度
                                      │
平台触控 ───────┐                     ▼
                ├─► InputFrame[] ─► Arena MatchCore ─► 只读快照 + 玩法事件
BotPolicy ──────┘                                      │
                                                       ▼
                                            Renderer3D / HUD / 音效
```

真人输入和机器人输入在进入 MatchCore 前已经统一。BotPolicy 不能获得可写的 MatchState，也不能直接提交命中或胜负。

## 已落地模块边界

Arena 使用独立的 `src/arena` 领域，没有改写当前 `src/core` 的数值跳台规则：

```text
src/arena/
├── config.js                 # 版本化比赛、物理、角色和时间配置
├── input-frame.js            # 玩家与机器人共用的输入合同
├── match-core.js             # 权威比赛状态机、击飞、淘汰和重生
├── replay.js                 # 输入录制、checkpoint 与严格回放
├── state-hash.js             # 量化权威状态 hash
├── physics/                  # PhysicsAdapter 与轻量物理实现
├── character/                # 不可变 Definition、Registry 快照、Runtime 引用与物理投影
├── action/ equipment/ rules/ # 多通道/lane 动作、装备与 RuleEngine 权威子系统
├── movement/                 # coyote/buffer/跳跃预算/模式与 Physics Port
├── map/ composition/ content/ # 地图 Definition、时间轴、策略与组合根
├── runtime/                  # 外层帧率到固定 60Hz tick 的编排
├── content/                  # 不含玩法权限的虚构对手资料
├── matchmaking/              # seed、对手、隐藏难度和独立随机流分配
├── ai/                       # 受限观察、效用目标与 InputFrame 生成
├── session/                  # Core、Bot、Runner 与回放的生命周期所有者
└── entry/                    # 无渲染三端 POC 入口
```

模块依赖只向权威内核收敛：`ai` 不导入 MatchCore、回放、会话、渲染或平台；MatchCore、物理与回放也不反向导入 `ai`、`matchmaking` 或 `session`。`session` 是组合根，负责把各层连接起来并在失败路径统一释放所有权。

## MatchCore 权威状态

MatchCore 独占：

- 当前 tick、阶段、倒计时、剩余时间和 match seed。
- 所有参赛者的位置、速度、朝向、生命、动作状态、冷却和装备。
- 地图碰撞面、淘汰边界、机关状态、刷新点和事件时间轴。
- 命中、冲量、硬直、拾取、淘汰、重生和胜负结果。

权威字段与内部状态转换均使用语言级私有边界；公开配置为深冻结只读值。合法输入在进入 tick 前完成校验，tick 内部若发生异常则 fail-closed 销毁本局，不允许在半更新状态上继续推进。

Renderer 不得使用模型碰撞盒、骨骼位置或动画事件反向修改这些状态。

## 快照与事件

每帧表现输入分为：

- `MatchSnapshot`：可插值的当前权威状态，不暴露 RNG 内部状态。
- `PresentationEvent[]`：已发生的命中、拾取、机关、淘汰和结算事件。

事件必须带稳定 ID、tick 和参与者 ID，使表现层可以去重、追赶或在上下文恢复后重建。

## 机器人边界

BotController 每个逻辑 tick 只读取受限的 `BotObservation`：

- 已公开的角色、装备、地图和预警状态。
- 当前可见位置、速度、冷却和安全方向。
- 自己的当前公开状态与经过难度延迟的对手公开状态。

难度参数和独立 RNG 流留在控制器内部，不进入观察对象。输出只能是当前 tick 的 `InputFrame`。难度通过反应延迟、规划频率、误差和策略权重形成，不通过隐藏信息或修改玩法参数形成。当前目标集合为边缘恢复、威胁规避、装备争夺、攻击、重新站位与控制中心。装备位置、对手持有状态和对手装备动作范围均来自同一延迟公开快照。

## 本地快速匹配边界

- `QuickMatchService` 不调用网络；它创建 match seed、抽取虚构对手形象，并等概率抽取内部难度。
- 对手形象与难度来自独立的具名 RNG 流，防止昵称或角色固定暴露难度。
- `QuickMatchService` 使用注入的 seed source、Core/Bot/Session factory 组合实例，便于测试和未来平台入口替换。
- `MatchSession` 是 MatchCore、BotController 和 HeadlessMatchRunner 的唯一生命周期所有者；暂停不推进 tick，App 在 `start()` 前发出的 hide/show 会被记忆并在启动时生效，内部失败 fail-closed 销毁整局。
- 生产返回值和快照不包含玩家可见的 `botDifficultyId`；内部诊断 sink 可以记录完整 assignment，生产实例不能覆盖难度。
- 匹配动画属于表现层，不改变 MatchCore tick、seed 或对局结果，也不伪造在线人数、聊天或真人身份。

## 确定性与测试

- MatchCore 使用固定 tick，不读取墙上时间。
- 地图、装备和机器人扰动使用可命名的独立 RNG 流。
- 输入可以记录并无渲染回放。
- 录制只在权威 tick 成功后提交；回放必须包含连续完整输入、递增 checkpoint、最终结算与一致事件，并在所有异常路径释放重放 Core。
- 对局配置生成 `configHash`，完整 Action/Equipment/Map/Character Authority Content 生成独立 `ruleContentHash`；运行中计算轻量状态 hash，定位配置篡改、内容版本错配、回放或跨平台差异。
- 阶段 3 批量模拟以是否结束、平均时长、命中与淘汰效率作为机器人骨架证据；装备争夺率、地图击杀来源和最终胜率在对应规则接入后补齐。

## 物理 POC

阶段 1 先评估三条路径，并对具备可用 JavaScript/WASM 分发的两条路径执行统一 POC：

1. 项目内轻量街机物理：圆/胶囊角色、简单平台面、显式冲量。
2. Rapier WASM：成熟碰撞、刚体和查询能力。
3. Box3D 3D WASM：因当前仍为 C17 alpha 且缺少成熟官方 JavaScript/WASM 分发，只做可用性评估，不进入可执行候选。

选择门禁：

- Web、微信、抖音构建和真机能稳定加载。
- 一名玩家、一名机器人、地图机关和拾取物在固定步长下满足性能预算，并为表现特效保留余量。
- 包体和 WASM 初始化成本可接受。
- 可实现稳定、可调而不是过度真实的击飞手感。
- 回放和批量测试结果可复现。

POC 结论为项目内轻量街机物理。Rapier 候选代码与依赖已移除；公共玩法 API 只交换普通数值对象。完整数据见 [物理 POC 结果](../research/arena-physics-poc-results.md)。

## 本地成长

第一版继续使用 Platform Contract 的存储能力保存：

- 已解锁外观和图鉴。
- 已开放地图。
- 音效、震动和减少动态效果设置。
- 可选的本地统计。

存档不是玩法真相，不参与单局命中、装备刷新或机器人难度分配；三档难度只由本局 seed 随机决定，不按玩家胜负暗中自适应。

## 后续长期边界

- Stage 6：S6.2 已让 Movement 和 Action Rule 统一决定合法动作并输出同源 affordance；后续 Platform 输入只负责转换为语义 `InputFrame`。
- Stage 7：玩法角色定义与表现角色定义分离；不同骨架共享动画语义，root motion 和动画事件不能驱动权威结果。
- Stage 8：产品壳使用显式状态机；本地 Profile 使用版本化双槽协议和幂等奖励；解锁只扩大双方共享内容池。
- Stage 9：平衡候选通过固定 seed、版本/hash、黄金回放和目标设备报告收敛；低档设备只降级表现，Core 保持 60 Hz。

这些边界按各 ADR 的状态管理。ADR-009 的 Rule/Core 边界已接受，但 Stage 6 完成仍需要 Bot、输入、灰盒、三端与 A/B 用户证据；其余后续 ADR 只有在对应自动化、运行时和用户验收齐全后才转为已接受。
