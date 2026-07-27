# Arena V2 绕后目标主动转身 Replay 原型结果 V1

## 状态与边界

- 状态：研究候选已通过目标主动转身与统一动作 Replay 验证，仍未进入生产内容
- 日期：2026-07-28
- 候选：`launch-06-flank`
- 实现：`packages/arena-v1-experiment/src/arena-v2-weapon-flank-replay-prototype.ts`
- 测试：`packages/arena-v1-experiment/test/arena-v2-weapon-flank-replay-prototype.test.ts`

本原型使用真实 `MatchCore`、普通 `moveX` 输入、`ArenaRuleEngine` 和 `MatchReplay`，验证绕后不是固定“目标背向就必定命中”的脚本：目标保持背向时命中，目标在 active 前转身后避开。

## 固定 Replay 结果

固定 seed 为 `1179402574`，Replay schema 为 V5，每场 6 个 checkpoint、60 个输入帧。动作开始事件在 tick 1；由于 MatchCore 在 tick 结束后发布快照，首次 active 快照为 tick 12，但命中事件发生在 tick 11。

| 场景 | 目标输入 | active 快照朝向 | 首次命中事件 | 最终 hash | 结论 |
|---|---|---:|---:|---|---|
| 保持背向 | tick 0 向右移动，之后不转身 | `+1` | tick 11 | `3809545a` | 攻击者处于目标背后，命中成立 |
| 转向攻击者 | tick 0 向右移动，tick 8 向左转身 | `-1` | 无 | `f0233aaa` | 目标主动转身后，rear-cone 不再命中 |

第二组 Replay 的快照同时记录了 tick 1 的 `targetFacingX=+1` 和 active 快照的 `targetFacingX=-1`，证明朝向变化来自普通移动输入，而不是探针直接写入位置或朝向。

## 迁移门禁影响

绕后现在通过：

- 正式动作状态：统一 `ActionExecutionSystem` 的 idle、windup、active、recovery 生命周期，以及目标转身前后的 active 判定；
- 候选 Replay：保持背向和主动转身两种场景都有 checkpoint、事件和最终 hash。

地图后果此前已经通过六段 KZ 灰盒探针。仍阻塞正式 Definition、正式反馈表现、多人拥挤和真人可读性，因此不会进入生产 `EquipmentRegistry`。

## 后续

1. 增加侧向进入、主动多次转身和多人遮挡；
2. 将“攻击者在目标背后 / 目标已转身”的因果差异接入正式反馈 Cue；
3. 在分叉路线和窄路上验证绕后是否增加观察负担；
4. 与读招反制一起完成正式 Definition 评审，不增加新的操作按键。
