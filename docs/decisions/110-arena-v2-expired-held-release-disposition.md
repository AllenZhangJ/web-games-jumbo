# ADR-110：过期持有供给释放时不可回到世界

## 状态

已接受并完成 Rule/Core、Replay/golden、Bot 与 Presentation read model 修订及主协调独立验收。PA5 总门已冻结，PA6-P 为 `completed / coordinator-approved / formalGate=false`（`95/100`），PA6 runner 正确性已签核；清洁 CPU 环境的正式 ABBA 复验仍未通过，因此 P1 不得 advance。

## 日期

2026-07-29

## 背景

ADR-108 第 6 条规定：仍处于 `spawned` 或 `dropped` 的供给在 `expireTick` 消失，已经被持有的武器不受供给过期影响。该表述没有覆盖“武器跨过 `expireTick` 后，持有者死亡或以其他方式释放武器”的路径。

压力复验证明，如果沿用普通死亡掉落，已经结束 lifecycle 的 held runtime 会重新进入 world；Timeline 已不再保留 active lifecycle，公开投影也不能把它作为可交互 supply 发布，因此会形成永远不能再次拾取的 world 残留。

本 ADR 只补充 ADR-108 的释放后果，不回写或抹去 ADR-108 的历史文本。

## 决策

1. 持有者可以跨过 `expireTick` 继续使用已持有武器；过期不会中断 held runtime 的当前使用。
2. 原供给 lifecycle 结束后，任何 owner release 都不得把该 runtime 写回 `spawned` 或 `dropped`。淘汰释放时，EquipmentSystem 在同一原子事务中将其回收并从权威 runtime/held owner 集合移除。
3. 该路径发出 `EquipmentDespawned`，payload reason 固定为 `supply-lifecycle-expired-held-drop`；不得伪造普通 `EquipmentDropped`。下一波对仍在槽位中的新供给继续使用既有 `EquipmentRecycled` → `EquipmentReplaced` 语义。
4. `expired-held disposition` 是供给时间轴过期转换产生、会影响未来 owner release 的权威状态。唯一写入者是 EquipmentSystem；它必须版本化、稳定排序并进入内部 snapshot/state hash，且在 replacement、late elimination、destroy 和 fail-closed 清理路径中同步退出。
5. `applySupplyTimelinePhase` 的 marker 写入与 runtime spawn/remove 共用同一 commit 保护区；任何异常都必须进入终止/清理路径，禁止 runtime 已提交而 disposition 未提交，或反之。

## 不采用的方案

- **放宽 public projection 接受过期后 world runtime**：这会把不可拾取的残留伪装成可交互供给，违反 supply identity/lifecycle 双向审计。
- **在 MatchCore 或 Presentation 按实例 ID 特判**：会新增第二个生命周期权威，并使 Replay、恢复和跨入口行为不一致。
- **把 disposition 留在 hash 外**：即使输入前缀重演可恢复，也会允许相同 equipment/timeline/hash 状态在未来淘汰时产生不同结果。

## 影响与兼容边界

- 普通 1v1 不创建 survival timeline/disposition，不新增公开快照字段，既有普通 Replay V5 输入/事件语义不变。
- 生存 Replay V5 的输入帧、事件类型、事件顺序和 final result 语义保持；当 disposition 非空时，内部 checkpoint hash 在其有效区间合法变化。Replay schema 仍为 v5，不新增静默兼容入口。
- 已有生存黄金场景的事件与 final hash 不变，但 1900–2400 的内部 checkpoint hash 会因 disposition 正式进入 hash 而更新。这是本 ADR 的独立规则修复，不是旧 hash 的迁移等价或零漂移声明。

## 验收证据

- `tests/arena/equipment-supply-timeline.test.ts`：过期 held 的 marker、淘汰回收、expire 前可掉落拾取、下一波替换清理 marker、runtime 有界。
- `tests/arena/match-core-survival-supply.test.ts`：disposition schema、排序/唯一、future schema、ghost/owner/slot 交叉校验与 hash 差异。
- `tests/arena/bot-survival-stress.test.ts` 与 `scripts/arena-formal-survival-bot-pressure.ts`：正式事件类型包含 `EquipmentDespawned`，并独立记录 `supply-lifecycle-expired-held-drop` reason coverage；smoke 不得冒充 formal gate。
- 受影响 Core/Equipment/Session 链、架构、typecheck、lint、文档、包构建与 golden verifier 必须分别记录；CPU、正式 300-case、Coverage、Presentation、Platform、真机和 P1 总体仍是独立未完成门。

## 回滚

安全回滚点为 `d750e4caa767332b5c3caaf247080b5717d56219`（保留其上的 B1 dirty 工作树合同）；回滚本 ADR 实现时必须同时撤回 expired-held marker、MatchCore despawn reason、disposition hash/测试和本 ADR 对应 golden 更新，不得触碰已提交的 A1.1/美术父提交或美术文件。
