# ADR-012：Arena 使用可复现实验收敛并只降级表现层

- 状态：已接受；S9.1a～S9.3a 已实施，S9.3 baseline 与 S9.4～S9.5 待执行
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
4. `ArenaExperimentReport` 将环境元数据与确定性结果分离。环境和生成时间不进入 `resultHash`，dirty candidate 永远不能获得 `freezeEligible=true`。Report schema V2 识别 Collector 输出的版本化 `ArenaMetricGate`；case 全部完成但专业覆盖、顺序或阈值门失败时，报告仍为失败且不可冻结。

单个 case 的 Core/场景失败会保留 seed、tick、事件数和有界结构化错误并按 Definition 阈值停止；Collector 或编排合同异常会使 Runner 整体失败，已创建 case/collector 仍必须清理。这样不会用残缺聚合结果掩盖采集器故障。

S9.1b 将原 MatchCore 专业压测实现为一个版本化 case，同时由两种外层驱动：`SimulationExperimentRunner` 负责不可变 Definition、深冻结观察、Collector 和确定性 Report；Node 压测脚本直接驱动同一个 case，负责 `process.cpuUsage`、GC 与 heap 预算。二者共享输入 Strategy、状态不变量、事件上限和抽样回放实现，但不把通用编排成本冒充为 Core tick 成本，也不把 Node 墙钟/内存写入确定性 Report。

S9.1c 将 Map、Movement 与 Bot 专业压测迁入同一合同：

- Map case 独占时间轴/公开快照/最终安全面断言，Collector 独占跨 seed 精确事件、回放与唯一 hash 门。
- Movement 的随机输入成为版本化 Strategy，只能由 match seed 具名流生成普通 `InputFrame`；全部样本使用统一长时限 candidate，避免同一 Definition 内隐式切换 Match config。
- Bot 的一个 case 使用同一 match seed 顺序运行 easy/normal/hard 三局，形成 paired sample；三局共享 Core config、地图/装备随机与基准玩家，只允许 Bot Profile 不同。能力指标、难度分布和工作负载分别由独立 Collector/Policy/Workload 负责。
- 原 `arena:map:stress`、`arena:movement:stress`、`arena:bot:stress` 只保留宿主参数、计时与兼容摘要，并直接驱动相同版本化 workload，禁止再维护第二份规则循环。

维护按规则大版本分组的黄金回放语料。当前版本必须严格重放；不兼容升级创建新目录，旧语料保留并验证明确拒绝。fuzz、soak 或真机发现的阻断缺陷缩减为最小复现并进入长期回归集。

S9.2 将该原则实现为版本化 `ArenaGoldenReplayManifest`、场景 Registry 和纯无宿主 Verifier。当前 Replay V5 的装备、地图、移动与生命周期场景既要严格重放，也要从注册场景重新生成并匹配完整 replay hash；Registry 与 Manifest 必须双向完全覆盖。Replay V4 通过稳定错误码在 Core 创建前拒绝。黄金结果不能由普通验证命令覆写：候选只能生成到仓库外，提升需要首建 token 或当前 Manifest hash 派生的替换 token，并在排他锁内完成临时目录复验、分阶段替换与失败回滚。

input fuzz 失败会形成固定 mapper、case index、uint32 seed 和严格回放要求的版本化候选；单 case CLI 可在输入推导策略未来变化后继续使用显式 seed 复现。只有真实失败缩减后才进入 `regression-*` 黄金场景，不提前伪造缺陷语料。

S9.3a 将实验 Definition 升级为向后读取 V1 的 V2：每个 Collector 的纯数据参数进入 Definition hash，并由对应 Registry 在创建实例前校验。固定的 300 个 paired seed、5 个 replay seed、时长/装备/淘汰 Policy 和严格 Bot 差值不接受 CLI 覆盖。完整 Report 通过版本化 Bundle 落盘；Reader 重建所有派生字段并核对 hash，写入使用 exclusive create 防止原候选被覆盖。具体取舍见 [ADR-022](022-arena-preregistered-balance-candidate.md)。

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

### 只保存最终 hash 或压缩二进制黄金语料

它能节省仓库体积，但无法人工审查输入、checkpoint、事件和结果是否属于预期场景，也不能证明读取完整历史格式。V5 先保存完整、可 diff 的 JSON；只有语料体积出现可测量问题时，才另立归档格式和兼容读取 ADR。

### 验证时直接覆盖黄金结果

会把实现缺陷误变成新基准。候选生成、验证和受 token 保护的提升必须分离，预期规则变化还需在评审中解释新旧差异。

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
- S9.2 已建立 Replay V5 Manifest、严格重放/再生成、Replay V4 Core 前拒绝、外部候选提升、input fuzz 单 seed 隔离和生命周期回归门。当前没有真实阻断缺陷，因此不制造 `regression-*` 样本；首个真实最小复现进入 Registry 后，双向覆盖门会要求同步提交语料。
- S9.3 工程阈值已按此前接受的默认值预注册；第一份 clean baseline 尚待运行。真人数据仍阻塞最终胜率区间与公平性冻结，脚本 benchmark、`freezeEligible` 或 clean Report 都不能替代。
- S9.4 前仍需项目方确认三端低档/主流目标机与可接受的 30 FPS 表现降级。
- 只有实验、黄金回放、fuzz、soak、三端性能证据和冻结评审全部通过，才能进入 Stage 10 RC。
