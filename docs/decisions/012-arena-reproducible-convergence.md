# ADR-012：Arena 使用可复现实验收敛并只降级表现层

- 状态：已接受；S9.1a 与 S9.1b MatchCore 迁移已实施，S9.3/S9.4 冻结输入待确认
- 日期：2026-07-17

## 背景

Stage 9 需要同时收敛对局时长、三档隐藏机器人、装备争夺、地图淘汰、连续多局可靠性和三端性能。仅凭少数试玩或覆盖同一份参数无法解释回归；仅看 Node 压测也不能证明手机渲染、包体或生命周期达标。

低档设备可能无法维持 60 FPS 表现，但为了性能直接降低 Core tick 会改变输入窗口、物理、机器人和回放结果。

## 决策

每个平衡候选都使用不可变 `ExperimentDefinition`，固定代码 commit、规则/内容版本和 hash、seed 集、基准策略、指标 schema 与停止条件。`SimulationRunner` 通过公开合同运行，`MetricCollector` 只读快照、事件和最终结果，输出包含原始计数与分母的机器可读报告。

S9.1a 将该边界实现为四层显式合同：

1. `ArenaExperimentDefinition` 只保存冻结数据，并固定 source dirty 状态、完整 Match config、Authority 身份、seed、workload、collector 与停止条件。
2. `SimulationWorkloadRegistry` 只组合版本完全匹配的 case factory；输入基准属于 workload 版本，不作为 Runner 内的隐藏分支。
3. `MetricCollectorRegistry` 创建实验级 Collector；Runner 只传深冻结观察，Collector 不持有 Core、Bot 或 RNG。
4. `ArenaExperimentReport` 将环境元数据与确定性结果分离。环境和生成时间不进入 `resultHash`，dirty candidate 永远不能获得 `freezeEligible=true`。

单个 case 的 Core/场景失败会保留 seed、tick、事件数和有界结构化错误并按 Definition 阈值停止；Collector 或编排合同异常会使 Runner 整体失败，已创建 case/collector 仍必须清理。这样不会用残缺聚合结果掩盖采集器故障。

S9.1b 将原 MatchCore 专业压测实现为一个版本化 case，同时由两种外层驱动：`SimulationExperimentRunner` 负责不可变 Definition、深冻结观察、Collector 和确定性 Report；Node 压测脚本直接驱动同一个 case，负责 `process.cpuUsage`、GC 与 heap 预算。二者共享输入 Strategy、状态不变量、事件上限和抽样回放实现，但不把通用编排成本冒充为 Core tick 成本，也不把 Node 墙钟/内存写入确定性 Report。

维护按规则大版本分组的黄金回放语料。当前版本必须严格重放；不兼容升级创建新目录，旧语料保留并验证明确拒绝。fuzz、soak 或真机发现的阻断缺陷缩减为最小复现并进入长期回归集。

性能分成两类独立门禁：

- 无渲染权威逻辑：固定 tick 成本、确定性、完成率和堆增长。
- 最终包表现：启动、帧时间、长帧、draw call、几何/纹理、内存、包体和生命周期恢复。

低档设备可通过版本化 `PresentationQualityDefinition` 降低阴影、轮廓、粒子、拖尾、分辨率与表现帧率；Core 始终保持 60 Hz，必要规则提示不能被删除。

设备证据沿用 [ADR-014](014-arena-versioned-device-acceptance-evidence.md) 已接受的 Definition/Record/Bundle/Report、完整 commit/build 绑定和内容寻址附件边界。Stage 9 通过新 Definition 增加低档/主流机与性能指标，不修改 Stage 6 记录，也不将墙钟或设备信息写入 Core/Replay。

## GitHub 借鉴边界

- Three.js 的 `renderer.info` 作为 draw call、program、geometry、texture 等基础数据源，版本与固定参考见 ADR-010。
- [BabylonJS/Spector.js](https://github.com/BabylonJS/Spector.js)，参考 commit `97927a00940d4c86620ee9de6e0e56f94d19db7c`，MIT：只作为开发期 WebGL 抓帧候选，不进入生产包、Rule/Core 或默认运行路径。

不因本 ADR 自动增加性能依赖；平台不可采集的指标必须标记未知，不能伪造为通过。

## 被否决方案

### 只凭开发者手感调参

手感测试必要，但没有固定 seed、版本和分层指标时无法定位出生侧、装备池、地图事件或难度造成的偏差。

### 只测试桌面浏览器或 Node

无法覆盖小游戏容器、目标 GPU、触控、前后台、WebGL context、包体和内存限制。

### 低档机降低 Core tick

会改变物理、输入窗口、AI 和回放，制造另一套玩法。只允许表现层独立降级。

### 在 Core 内直接读取浏览器性能 API 或上报指标

会污染确定性和平台边界。采集必须通过注入 Port 或外层只读观察完成。

### 按玩家近期输赢暗中调整机器人难度

破坏 seed 可复现与随机三档承诺，也会形成难以解释的操控感。V1 难度仍只由独立 seed 流随机决定。

## 后果

正面：

- 平衡与性能结论有版本、输入和设备证据，可以复现和回滚。
- 高低质量路径共享同一比赛结果，不出现设备相关规则。
- 线上前的阻断缺陷逐步沉淀为长期资产。

代价：

- 需要维护实验 manifest、黄金语料、报告 schema、目标机矩阵和证据归档。
- 精确预算必须等待目标设备确认与最终包实测，不能只靠架构阶段预估。

## 分批生效与剩余条件

- S9.1 实验合同现在生效；后续专业压测必须按 workload/collector 扩展，不能把特殊统计重新写进通用 Runner。
- S9.2 仍需建立黄金回放 manifest、严格历史拒绝和失败样本缩减流程。
- S9.3 前仍需真人数据与平衡阈值，首条 scripted-pressure workload 不能代表最终公平性。
- S9.4 前仍需项目方确认三端低档/主流目标机与可接受的 30 FPS 表现降级。
- 只有实验、黄金回放、fuzz、soak、三端性能证据和冻结评审全部通过，才能进入 Stage 10 RC。
