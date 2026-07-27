# Arena V2 研究武器双人拥挤与地图边缘 Replay 结果 V1

## 文档状态

- 状态：候选验证完成；不进入默认生产 `EquipmentRegistry`
- 日期：2026-07-28
- 目的：验证直线压制、读招反制、绕后在当前真实双人 MatchCore 边界下，同时出招与窄平台是否产生可区分的命中、击退和反馈结果
- 实现：`packages/arena-v1-experiment/src/arena-v2-weapon-multiplayer-edge-replay-prototype.ts`
- 测试：`packages/arena-v1-experiment/test/arena-v2-weapon-multiplayer-edge-replay-prototype.test.ts`、`tests/arena/experiment/arena-v2-weapon-research-feedback.test.ts`

## 1. 验证边界

当前 MatchCore 的终局模型是双人对局，因此本轮没有虚构三人或网络多人规则，采用真实的双参与者边界：

- 两名玩家同时持有同一研究候选武器；
- 双方在 tick 1 同时出招；
- 平台宽度为 `7.0`，目标起始横坐标为 `2.8`，接近右侧边缘；
- 读招反制按住 primary 完成承诺，绕后通过 tick 0 的普通 `moveX` 让目标转向；
- 使用真实 `MatchCore`、`ArenaRuleEngine`、`PhysicsWorld`、`MatchReplay` 和 V5 checkpoint/hash 验证；
- 反馈来源取自真实 Replay 的 `HitResolved` 事件及后续 `PlayerEliminated` 结果，不由表现层重新推断。

这一步验证的是“双方同时出招 + 地图边缘”这一当前双人产品边界，不代表已经完成三人房间、网络同步或正式多人平衡。

## 2. 固定证据

| 候选 | 双方动作开始 | 命中事件 | 地图结果 | 反馈语义 | checkpoint / inputs | final hash |
|---|---|---|---|---|---:|---|
| 直线压制 | tick 1 / tick 1 | tick 9，双方互相命中 | `player-2` 击落 | `hit-ring-out` | 11 / 116 | `efd1a73c` |
| 读招反制 | tick 1 / tick 1 | tick 25，双方互相命中 | 双方仍有支撑面 | `hit-confirm` | 11 / 120 | `ca1c67e9` |
| 绕后 | tick 1 / tick 1 | tick 11，仅 `player-1 → player-2` 命中 | 双方仍有支撑面 | `hit-confirm` | 11 / 120 | `1a62479a` |

三组 Replay 二次验证后的最终 hash 均一致。绕后中，`player-2` 在 tick 0 向右转身，攻击者从目标背后命中；目标的同时出招没有命中攻击者，说明拥挤情况下仍保留了目标朝向语义。

## 3. 反馈事件接入

每个真实 `HitResolved` 事件保留自身 `id`、`sequence`、tick、攻击者、目标和动作 ID，再把同一候选的反馈语义投影到现有 `WeaponFeedbackPresented`：

| 研究结果 | Presentation Cue | 约束 |
|---|---|---|
| 直线压制击落 | `ring-out` / `weapon-ring-out` | 来源必须是命中事件，不能由 Canvas 位置猜测 |
| 读招反制命中但未击落 | `impact-confirm` / `weapon-hit` | 保留双方同时命中的来源上下文 |
| 绕后命中但未击落 | `impact-confirm` / `weapon-hit` | 保留目标朝向导致的命中来源 |

`PresentationEventWindow` 已验证来源 ID、sequence 和重复事件去重。研究候选现在具备“真实 Replay 来源 → 反馈语义 → Presentation Cue”的研究链，但仍不是生产动作来源，也没有最终声音/特效资产或真机证据。

## 4. 结论与限制

本轮关闭了三个候选在双人同时出招、窄平台和真实反馈来源上的第一轮问题：

- 武器差异不只来自外观，直线压制产生更早的双向命中并把边缘目标击落；
- 读招反制的长承诺仍能在双方交错命中时保留明确的命中结果；
- 绕后在双方同时操作时仍依赖目标朝向，而不是“进入范围就命中”；
- 反馈层可以消费真实事件 ID，不需要重新判定命中原因。

尚未关闭：

- 三人或 2v2 规则与网络多人；
- 攻击与跳跃同时发生时的边缘恢复；
- 绕后的侧向进入和分叉路线遮挡；多次转身已由独立 Flank Replay 补齐；
- 真人是否能读懂击落与命中反馈；
- 默认生产 `EquipmentDefinition`、最终声音/特效和设备验收。
