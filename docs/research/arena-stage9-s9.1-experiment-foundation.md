# Arena Stage 9 S9.1a 可复现实验基础结果

## 结论

S9.1 的第一批基础已经落地，但 S9.1 尚未整体完成。仓库现在具有不可变实验 Definition、版本化 Workload/Collector Registry、无宿主 Runner 和机器可读 Report；现有 Match/Map/Bot 压测仍需逐条迁移并保留专业断言。

## 已实现边界

- `ArenaExperimentDefinition` 固定 source commit/dirty、完整解析 Match config、Authority 版本/hash、明确 seed 集、workload/collector 版本和失败停止条件。
- `SimulationExperimentRunner` 不依赖 Three.js、DOM、平台 API、墙钟或随机源；它只消费 workload case port 并向 Collector 发送深冻结观察。
- case 失败形成带 seed/tick/事件数的失败记录；超过阈值立即停止剩余 seed。
- Collector 异常是终止性基础设施失败，不会降级成普通 case，也不会发布半聚合报告。
- `ArenaExperimentReport.resultHash` 只覆盖 Definition、case 与指标；`generatedAt` 和运行环境不影响确定性结果。
- dirty source 可用 `--allow-dirty` 做开发验证，但 Report 保持 `freezeEligible=false`。
- CLI 会在运行后复核 Git commit 与 dirty 状态；实验期间身份漂移时拒绝发布 Report，避免把竞态窗口内的结果误送入冻结评审。
- Match Summary 同时输出原始计数、分母和派生值，0 分母用 `null`，不生成 `NaN` 或伪造 0%。

## 第一条 workload 的解释边界

`arena.stage9.scripted-pressure` 使用版本化脚本驱动双方移动和攻击，覆盖完整 Match/Map/Equipment 事件并验证不同 seed 的结果隔离。双方使用不同固定节奏，因此它只证明编排、确定性、生命周期与指标基础，不是公平性测试，也不能替代隐藏三档 Bot 或真人基准。

后续 Bot、Map、Movement workload 必须通过 Registry 新增实现；通用 Runner 不增加难度、地图或装备特判。

## 使用

```bash
# 只检查将要运行的实验身份
npm run arena:experiment -- --describe

# 正式候选：工作区必须干净，默认执行 30 个固定 seed
npm run arena:experiment

# 开发期小样本；仍会明确标记为不可冻结
npm run arena:experiment -- --cases=2 --allow-dirty
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

## 尚未完成

- 迁移 Match/Map/Bot/Movement 专业压测与 CPU/heap 采集。
- S9.2 黄金回放 manifest、历史 schema 拒绝和最小失败语料。
- S9.3 预注册平衡候选与真人阈值。
- S9.4 质量 profile、目标设备性能 Definition 和六类低档/主流设备证据。
- S9.5 冻结评审与 Stage 10 RC 输入。
