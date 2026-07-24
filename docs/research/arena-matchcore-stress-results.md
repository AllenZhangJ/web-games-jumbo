# Arena V1 MatchCore 批量压测结果

## 状态

Stage 9 S9.1b MatchCore 专业迁移的本机无渲染门禁已通过，最近开发候选复测于 2026-07-18。本轮包含三件装备、风场、动态 surface、装备波、地图快照与回放成本。结果只证明版本化 MatchCore workload case 的权威逻辑成本与稳定性，不等价于通用实验 Runner 开销、Renderer、正式 Bot 或目标真机整帧性能。

## 方法

- 使用正式 60Hz、3 条命、180 tick 准备、120 秒突然死亡、150 秒硬结束配置。
- `arena.stage9.matchcore-invariants` 固定原压测的序列索引节奏；两名参赛者都只通过标准 `InputFrame` 提交追击、走位和上下文动作，装备使用不存在特权调用。
- 连续运行 1,000 局；每 tick 检查位置、速度、计时和状态有限性。
- 每局验证权威时限、有效 surface、ground support、装备位置、结果、2,000 事件上限与最终 hash；Definition 明确登记 5 个 replay seed 并验证 checkpoint、事件序列和最终 hash 一致。
- 压测前后显式触发 GC，记录回收后的堆增量。
- `arena:stress` 直接驱动与通用实验相同的 workload case，以隔离 Core 成本；`arena:experiment:matchcore` 另行验证 Definition/Registry/Collector/Report 编排，不混用两种性能口径。

执行命令：

```bash
npm run arena:stress
```

测量环境：Node.js 20.19.5，macOS arm64。开发候选绑定基线 commit `6c619d62f0cfa71294fb05f0ee422a94e7e1f3be`，运行时 `sourceDirty=true`，Definition hash `b131ae0b`；因此本次只作为提交前门禁，不是 clean-source 冻结证据。

## 结果

| 指标 | 结果 | 门禁 |
|---|---:|---:|
| 完整对局 | 1,000 / 1,000 | 必须全部结束 |
| 权威 tick | 1,026,775 | 无固定上限 |
| 平均每局 tick | 1,026.775（约 17.11 秒） | 仅为压力脚本行为，不作平衡结论 |
| 最长对局 tick | 1,953 | 不超过权威时限 |
| 平均逻辑成本 | 0.239613 ms/tick | ≤ 0.25 ms/tick |
| 非有限状态 | 0 | 必须为 0 |
| 不变量失败 | 0 | 必须为 0 |
| 回收后堆增长 | 3,970,416 B | ≤ 33,554,432 B |
| 抽样严格回放 | 5 / 5 | 必须全部一致 |
| 唯一最终 hash | 1,000 | 用于发现意外状态复用 |
| 正常决胜 | 980 | 统计项 |
| 同时淘汰平局 | 20 | 统计项 |

总计产生 75,501 个权威事件，其中包含 3,000 次初始装备刷新、1,772 次拾取、1,736 次掉落、4,882 次淘汰和 3,862 次重生。普通压力输入大多在首个风场启动前结束，因此完整地图时间轴仍由独立的 [Stage 5 地图压测](arena-map-stress-results.md) 覆盖。

## 结论与边界

MatchCore 共享 workload case 仍低于 `0.25ms/tick` 阶段预算，未发现无法结束、非有限状态、回放分叉、非法 surface 支撑、装备滞留、seed 状态复用或持续堆增长。该预算只约束直接 case/Core 路径；通用实验 Runner 的防御性复制和 Collector 聚合不得冒充 Core 回归，也不能据此证明渲染、正式 AI 或目标真机性能。
