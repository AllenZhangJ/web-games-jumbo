# Arena Stage 9 S9.1a～S9.1c 可复现实验与专业压测迁移结果

## 结论

S9.1a 实验基础、S9.1b MatchCore 迁移与 S9.1c Map/Movement/Bot 迁移已经落地，S9.1 实现边界完成。仓库现在具有不可变实验 Definition、版本化 Workload/Collector Registry、无宿主 Runner、机器可读 Report 和可阻止冻结的 Metric Gate。下一批进入 S9.2 黄金回放、模糊与回归语料。

## 已实现边界

- `ArenaExperimentDefinition` 固定 source commit/dirty、完整解析 Match config、Authority 版本/hash、明确 seed 集、workload/collector 版本和失败停止条件。
- `SimulationExperimentRunner` 不依赖 Three.js、DOM、平台 API、墙钟或随机源；它只消费 workload case port 并向 Collector 发送深冻结观察。
- case 失败形成带 seed/tick/事件数的失败记录；超过阈值立即停止剩余 seed。
- Collector 异常是终止性基础设施失败，不会降级成普通 case，也不会发布半聚合报告。
- `ArenaExperimentReport.resultHash` 只覆盖 Definition、case 与指标；`generatedAt` 和运行环境不影响确定性结果。
- dirty source 可用 `--allow-dirty` 做开发验证，但 Report 保持 `freezeEligible=false`。
- CLI 会在运行后复核 Git commit 与 dirty 状态；实验期间身份漂移时拒绝发布 Report，避免把竞态窗口内的结果误送入冻结评审。
- Match Summary 同时输出原始计数、分母和派生值，0 分母用 `null`，不生成 `NaN` 或伪造 0%。
- Report schema V2 会验证可选 `ArenaMetricGate`；case 全部完成但专业断言未过时，`outcome=failed`、`freezeEligible=false`，失败 check ID 会进入结构化报告。

## MatchCore 专业迁移边界

- `arena.stage9.matchcore-invariants` 固定原 1,000 局压测的序列索引输入节奏，并继续只通过标准 `InputFrame` 驱动 MatchCore。
- workload case 每 tick 检查有限状态、地图至少一个有效 surface、ground support、装备位置、地图 tick 对齐和单局事件上限。
- Definition 明确登记抽样 replay seed；被抽样 case 必须严格重放并得到相同最终 hash，Collector 同时核对 replay 分母。
- MatchCore Collector 输出失败局、tick/事件分母、结果原因、赢家、事件分布、回放数和唯一最终 hash，不把失败局的部分统计混入成功样本。
- 通用 Runner 与 Node CPU/heap benchmark 直接驱动同一个版本化 case。前者测确定性编排，后者测 Core 路径；Node 墙钟、CPU 和内存不进入确定性 `resultHash`。

## 第一条 workload 的解释边界

`arena.stage9.scripted-pressure` 使用版本化脚本驱动双方移动和攻击，覆盖完整 Match/Map/Equipment 事件并验证不同 seed 的结果隔离。双方使用不同固定节奏，因此它只证明编排、确定性、生命周期与指标基础，不是公平性测试，也不能替代隐藏三档 Bot 或真人基准。

## Map、Movement 与 Bot 专业迁移边界

- `arena.stage9.map-timeline` 每 tick 验证公开快照不泄漏 `privatePlan`、至少一个有效 surface、ground support 与装备位置；最终只允许 `tile-center`，13 个 occurrence 和五类事件数量逐 case 精确核对。
- `arena.stage9.movement-stress` 把确定性随机输入提取为独立 Strategy，并检查空中跳预算、蹲跳蓄力、临时模式清理、ActionAffordance 身份和有限状态。Stage 9 Definition 对全部样本使用统一 4,200 tick 长时限，避免按 case 偷换 config。
- `arena.stage9.bot-capability` 将同一个 match seed 配成 easy/normal/hard 三局，形成 paired case。基准玩家、Bot Controller、QuickMatch/LocalMatchSession 仍只通过公开 `InputFrame` 和受限观察运行；Collector 分别负责能力、覆盖和隐藏难度分布，Bot Profile 是三局唯一难度变量。
- 旧 stress CLI 与通用 CLI 直接驱动同一 workload。宿主计时、Git 身份和 stdout 不进入 `resultHash`，专业断言不再复制到脚本。

## 使用

```bash
# 只检查将要运行的实验身份
npm run arena:experiment -- --describe

# 正式候选：工作区必须干净，默认执行 30 个固定 seed
npm run arena:experiment

# 开发期小样本；仍会明确标记为不可冻结
npm run arena:experiment -- --cases=2 --allow-dirty

# MatchCore 专业实验：1,000 局、5 个显式 replay seed
npm run arena:experiment:matchcore

# Map / Movement / Bot 专业实验
npm run arena:experiment:map
npm run arena:experiment:movement
npm run arena:experiment:bot

# 同一 workload case 的 Node CPU/GC 门禁
npm run arena:stress
```

退出码 `0` 表示全部 case 通过且源码干净，或调用者明确允许 dirty 开发运行；退出码 `2` 表示 case 失败或 dirty candidate 不可冻结；退出码 `1` 表示 Definition、Registry、Runner、Collector、Git 或 I/O 合同失败。

## 当前验证

- Definition 深冻结、严格 seed、未知字段、访问器拒绝。
- Registry 重复 ID 与版本漂移在运行前拒绝。
- 同 Definition/seed 在不同生成时间与运行环境描述下得到相同 `resultHash`。
- case 失败丢弃该局部分指标，并按失败阈值停止。
- Collector 失败使 Runner fail closed，同时回收活动 case 与全部 Collector。
- 两局真实 Arena V1 小时限集成实验完成，Match Summary 分母完整且两次运行 hash 一致。
- 实际默认配置的 30 个固定 seed dirty 开发运行全部完成：29,939 tick、2,144 个事件、30 个唯一最终 hash；Report 正确保持 `freezeEligible=false`。脚本双方不同节奏得到 `player-1 21 / player-2 9`，该分布只作为“此 workload 不可用于公平性结论”的验证，不是平衡候选证据。
- MatchCore 小时限集成验证覆盖 2 局、1 个抽样 replay、唯一最终 hash、事件上限失败和两次运行 `resultHash` 一致；正式 1,000 局结果继续记录在 [MatchCore 批量压测](arena-matchcore-stress-results.md)。
- 同一 workload case 的 1,000 局 dirty 开发候选 CPU/GC 门完成 1,026,775 tick：1,000/1,000 完成、5/5 replay、1,000 个唯一 hash、0 不变量失败，平均 `0.239613ms/tick`，GC 后堆增长 `3,970,416B`；由于 `sourceDirty=true`，该结果不作为冻结证据。
- Map dirty 开发门完成 100/100、720,100 tick、3/3 replay、100 个唯一 hash；事件计数为预警 1,300、开始 1,300、结束 600、surface 塌陷 800、装备波 400，全部 Metric Gate 通过。
- Movement dirty 开发门完成 100/100、415,936 tick、3/3 replay、100 个唯一 hash；全部样本使用长时限，走/跑与五类正式移动动作均覆盖，下砸启动 3,860、权威落地 3,790，全部 Metric Gate 通过。
- Bot paired dirty 开发门以每档 30 局、共 90 局验证：能力指数 `6.0 < 18.6 < 20.2`，净生命压力与得分率保持 easy/normal/hard 顺序；9/9 replay、每档 30 个唯一 hash、全部移动/地图覆盖和 10,000 seed 难度分布门通过。它只证明迁移和相对顺序，不替代 300 paired seed 的 clean 候选报告。

## 尚未完成

- S9.2 黄金回放 manifest、历史 schema 拒绝和最小失败语料。
- S9.3 预注册平衡候选与真人阈值。
- S9.4 质量 profile、目标设备性能 Definition 和六类低档/主流设备证据。
- S9.5 冻结评审与 Stage 10 RC 输入。
