# Arena V2 武器攻击/跳跃穿插 Replay 原型结果 V1

## 1. 状态与边界

- 状态：研究候选验证通过，仍属于 research-only 工具链
- 日期：2026-07-28
- 实现：`packages/arena-v1-experiment/src/arena-v2-weapon-attack-jump-interleave-replay-prototype.ts`
- 测试：`packages/arena-v1-experiment/test/arena-v2-weapon-attack-jump-interleave-replay-prototype.test.ts`
- 关联门禁：`packages/arena-v1-experiment/src/arena-v2-weapon-production-migration-gate.ts`

本原型验证的不是“能不能连续按更多键”，而是当前约定的基础操作是否成立：方向 + 跳跃保持简单，攻击可以和跳跃在同一输入时刻产生可读的独立结果；进入空中后，同一件武器切换到自己的空中动作，而不是只换外观或继续复用地面判定。

当前 MatchCore 仍是双人权威边界，结果不代表三人、网络同步或最终产品平衡。

## 2. 两个场景

### 同 tick 独立通道

在完成拾取后，`player-1` 于 tick 1 同时发送 `primaryPressed + jumpPressed`。三个候选都记录了同一个 tick 的：

- 候选自己的地面武器动作开始；
- `movement.explicit-ground-jump` 开始；
- 玩家离开支撑面，但动作状态没有互相覆盖。

这证明“攻击 + 跳跃”不是二选一的额外操作复杂度，也没有让表现层猜测哪个动作先发生；两条权威动作通道都产生了 `ActionStarted` 事件。

### 空中武器动作

第二个场景先在 tick 1 跳跃，再于 tick 7 按攻击。三个候选都切换到各自的 aerial `ActionDefinition`，并执行 `begin-down-smash`，快照中的 movement mode 为 `down-smash`。

| 候选 | 地面动作 | 空中动作 | 同 tick 攻击+跳跃 | 空中动作 | 空中 movement mode |
|---|---|---|---|---|---|
| 直线压制 | `research-line-pressure-ground` | `research-line-pressure-aerial` | 通过 | 通过 | `down-smash` |
| 读招反制 | `research-read-punish-ground` | `research-read-punish-aerial` | 通过 | 通过 | `down-smash` |
| 绕后 | `research-flank-ground` | `research-flank-aerial` | 通过 | 通过 | `down-smash` |

## 3. Replay 证据

所有场景都使用 `MatchReplay` schema V5、固定 seed `1229870149`、6 tick checkpoint 间隔和 84 个输入帧；每个候选的两个场景均通过二次 Replay 最终 hash 校验。

| 候选 / 场景 | 关键动作开始 tick | checkpoint | 最终 hash |
|---|---|---:|---|
| 直线压制 / 同 tick | 地面攻击 + 跳跃：1 | 8 | `0be62679` |
| 直线压制 / 空中 | 空中攻击：7 | 8 | `6b71244e` |
| 读招反制 / 同 tick | 地面攻击 + 跳跃：1 | 8 | `594452c2` |
| 读招反制 / 空中 | 空中攻击：7 | 8 | `7fe090f7` |
| 绕后 / 同 tick | 地面攻击 + 跳跃：1 | 8 | `06f03b59` |
| 绕后 / 空中 | 空中攻击：7 | 8 | `fbded32f` |

## 4. 结构性修正

验证前，研究候选的空中 `ActionDefinition` 只有 targeting、时序和击退 effect，缺少正式武器空中动作已有的 `begin-down-smash`。本批将该 effect 作为 `aerial: true` 的统一 Definition 规则加入研究候选生成器，并重新通过 Replay 验证。

这条修正的意义是：空中动作的数值差异现在不仅展示在概览，也实际改变 movement mode 和后续物理语义；研究候选不再出现“页面写空中动作、权威状态仍是普通跳跃”的漂移。

## 5. 尚未完成

- 仍没有将三个候选加入正式 `EquipmentRegistry`、玩家存档或生产目录；
- 尚未验证侧向进入、连续转身、多人遮挡和最终命中特效/音效；
- Replay 证明确定性和状态因果，不等于真人能在 3 分钟内读懂；
- `down-smash` 是当前规则语义，最终攻击姿态、音效和视觉资产仍需正式资产门禁。

因此本结果关闭“攻击/跳跃穿插研究验证”这一项，但不关闭正式 Definition 迁移门禁。
