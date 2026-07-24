# ADR-041：移动压力输入使用跨平台确定性方向表

## 状态

已接受。

## 日期

2026-07-24。

## 背景

治理候选 `af410da6744d8fe41ea9d98da376c3f198aff03f` 在 macOS 本地完整门禁通过，但 GitHub Actions Linux/Node 20 的 `quality` job 在 706 项 Node 测试中的两项黄金回放检查失败。失败都指向 `movement.semantic-actions` 的重新生成结果与 Manifest 不一致；同一已提交 Replay 在 Linux 上能够严格重放，其余 704 项通过。

移动压力输入生成器此前使用 `Math.atan2`、`Math.sin` 和 `Math.cos` 从运行时位置和随机角度生成方向。这些超越函数的末位结果不属于 ECMAScript 的跨系统逐位一致保证。末位差异会进入完整 `InputFrame` 和 Replay 字节 hash，即使量化后的权威状态 hash 没有变化，也会使“同 seed 重新生成相同 Replay”门禁在 macOS 与 Linux 间漂移。

## 决策

- 移动压力 Strategy v2 使用有序、冻结的 12 向有理方向表，不再调用运行时三角函数。
- “朝向中心”先按权威状态 hash 相同的 `1_000_000` 尺度量化位置，再用点积选择最接近中心的固定方向；相同量化权威状态必然走相同分支。
- 随机方向只由具名确定性 RNG 在固定表中选取；方向表顺序属于 Strategy v2 合同。
- `arena.stage9.movement-stress` Workload 与 S9.1 Experiment 身份提升到 v2；黄金场景 `movement.semantic-actions` 提升到 v2。
- 使用既有受控 promotion 流程替换该场景 fixture。Replay schema 仍为 v5，其他三个场景字节不变；Manifest 从 `0dace228` 更新为 `a53b401d`。

## 未采用方案

### 放宽重新生成检查

拒绝。只验证已提交 Replay 能重放会隐藏输入生成器的跨平台漂移，降低确定性门禁。

### 对三角函数结果做小数舍入

拒绝。舍入能降低常见末位差异，但在舍入边界仍依赖平台三角函数结果，不能形成清晰的离散合同。

### 在 CI 固定 macOS Runner

拒绝。这会绕开 Linux 复现问题、增加成本，并不能证明回放在其他受支持环境稳定。

## 影响

- 生产 Gameplay V2 配置、玩家输入、MatchCore、Replay schema 和三端 Product bundle 逻辑均不改变。
- 移动压力实验的输入分布和黄金 movement fixture 有意变化，因此旧 S9.1 v1 结果保留为历史证据，不能与 v2 数值直接混算。
- 新黄金 movement 场景结果为 replay hash `8673e0bf`、final hash `e560dd88`；其余三个场景保持原 replay/final hash。
- 回滚点是本 ADR 对应提交；回滚时必须同时恢复 Strategy/Workload/Scenario 版本和完整黄金 fixture，禁止只回退 Manifest。

## 验证

- 单测会把 `Math.atan2/sin/cos` 替换为抛错实现并证明 Strategy v2 仍可生成有限输入。
- 黄金语料必须 4/4 严格重放并重新生成，Manifest 必须为 `a53b401d`。
- GitHub Actions Linux `quality` 必须在精确候选提交上通过后，才能关闭本次跨平台阻断。
