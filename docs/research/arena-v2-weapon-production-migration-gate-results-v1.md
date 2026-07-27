# Arena V2 首发武器生产迁移门禁结果 V1

## 1. 状态与边界

- 状态：门禁已建立，六个候选均未晋级生产
- 日期：2026-07-28
- 适用范围：Arena V2 开发/测试工具链
- 实现：`packages/arena-v1-experiment/src/arena-v2-weapon-production-migration-gate.ts`
- 测试：`packages/arena-v1-experiment/test/arena-v2-weapon-production-migration-gate.test.ts`
- 关联决策：[ADR-074：首发武器必须通过五项生产迁移门禁](../decisions/074-arena-v2-weapon-production-migration-gate.md)

这份门禁的作用是把“研究原型通过”和“正式武器可以上线”分开。候选 `EquipmentDefinition` 虽已存在于内容层的显式 opt-in Registry，但门禁不会把它们接入默认生产目录，也不会创建收藏 ID、存档字段或玩家可见武器。

## 2. 五项门禁

每个首发候选都必须同时通过以下五项：

| 门禁 | 要求 | 当前判定 |
|---|---|---|
| 默认生产 Definition/注册 | 地面/空中动作来自默认生产 Equipment/Action Registry，并由权威调优提供数值 | 3 把生产基线通过，3 把研究候选阻塞 |
| 正式动作状态 | 具备正式动作身份、前摇、有效、收招、冷却及冲突/取消规则 | 生产基线通过；三个研究候选均已通过研究边界内的统一动作状态 |
| 正式回放 | 有候选专属 MatchReplay fixture、checkpoint 和最终 hash | 三把生产基线仍阻塞；三个研究候选已有候选 Replay |
| 地图后果 | 在 KZ 灰盒中出现可解释的命中安全/击落或路线转移差异 | 六把均已有研究证据 |
| 反馈表现 | 权威反馈事件带有动作来源，并接入表现链 | 生产基线通过；三个研究候选已通过研究边界的真实 Replay 来源映射 |

## 3. 当前结果

| 候选 | 来源 | 已通过 | 阻塞项 | 生产状态 |
|---|---|---:|---|---|
| 冲锋盾 | 生产基线 | 4/5 | 正式回放 | 不晋级 |
| 重锤 | 生产基线 | 4/5 | 正式回放 | 不晋级 |
| 引力锁链 | 生产基线 | 4/5 | 正式回放 | 不晋级 |
| 直线压制 | 研究候选 | 4/5 | 默认生产注册 | 不晋级 |
| 读招反制 | 研究候选 | 4/5 | 默认生产注册 | 不晋级 |
| 绕后 | 研究候选 | 4/5 | 默认生产注册 | 不晋级 |

“地图后果已通过”只表示研究探针已经看到武器差异会改变路线结果，不表示平衡、多人拥挤、复活重入或真人可读性已经完成。

## 4. 直线压制第一步：正式动作状态与候选 Replay

直线压制已经进入“可复现的候选动作状态”阶段，但仍保持默认生产边界：

- 使用实际 `MatchCore`、`ArenaRuleEngine` 和 `ActionExecutionSystem`，不是只调用独立时序函数；
- 使用 `MatchReplay` schema V5，固定 seed `1279872581`，共 6 个 checkpoint、60 个输入帧；
- 动作开始于 tick 1，首次命中于 tick 9；
- 权威动作状态序列为 `idle → windup → active → recovery`；
- Replay 最终 hash 为 `66f3a1a1`，二次回放核对通过。

这一步证明直线压制的动作身份、命中事件和回放可以在统一权威链路中复现，但没有把它注册为生产 `EquipmentDefinition`，也没有宣称最终声音、特效和设备可读性完成。

## 5. 读招反制：承诺状态与三组 Replay

读招反制已经从独立整数 tick 原型接入真实 `MatchCore → ArenaRuleEngine → ActionExecutionSystem → MatchReplay` 链路，但仍保持默认生产边界：

- 使用 `commitTicks=12`、`expireTicks=18`、允许蓄力转向的可选 `ActionDefinition.commitment`；
- 动作前摇为 24 tick，确保提前取消和到期取消在 active 前完成；
- 三组固定 Replay 均为 schema V5、9 个 checkpoint、96 个输入帧，固定 seed `1380270404`；
- 提前释放：tick 9 取消、无命中、最终 hash `42d4f4b9`；
- 成功提交：tick 13 提交、tick 25 首次命中、最终 hash `ceda8789`；
- 到期持续按住：tick 19 取消、无命中、最终 hash `42d4f4b9`；
- 快照可看到 `charging/committed`、蓄力 tick、蓄力等级和结果朝向，事件可区分取消与提交。

这一步关闭了读招反制的候选动作状态、候选 Replay 和研究反馈来源门禁，但没有关闭默认生产注册、最终反馈资产、三人/网络多人、主动转身和真人可读性。

详细记录见[读招反制承诺状态与 Replay 原型结果 V1](arena-v2-weapon-read-punish-replay-results-v1.md)与[ADR-075](../decisions/075-arena-v2-action-commitment-state.md)。

## 6. 绕后：目标主动转身、多次转身与三组 Replay

绕后已经从固定“目标背向”探针接入真实 `MatchCore → ArenaRuleEngine → MatchReplay` 链路，但仍保持候选内容边界：

- 固定 seed `1179402574`，三场 Replay 均为 schema V5、6 个 checkpoint、60 个输入帧；
- 保持背向：目标 tick 0 向右移动后不转身，active 快照朝向 `+1`，tick 11 命中，最终 hash `09e8fa18`；
- 主动转身：目标 tick 8 向左移动，active 快照朝向 `-1`，无命中，最终 hash `6d288ae4`；
- 多次转身：目标 tick 8 左转、tick 10 右转，active 前恢复朝向 `+1`，tick 11 命中，最终 hash `e20f937b`；
- 三场使用普通 `moveX` 输入，快照记录了 tick 1 的 `+1` 到 active 阶段 `-1` 的变化，以及多次转身后的 `+1`，证明不是直接写入目标朝向。

这一步关闭了绕后的候选动作状态、候选 Replay 和研究反馈来源门禁；侧向进入已由同一 Replay 补齐，多目标视线遮挡已由独立研究探针补齐观察证据，但没有关闭默认生产注册、最终反馈资产、三人/网络多人规则和真人可读性。

详细记录见[绕后目标主动转身 Replay 原型结果 V1](arena-v2-weapon-flank-replay-results-v1.md)与[多目标视线遮挡研究原型结果 V1](arena-v2-weapon-occlusion-research-prototype-results-v1.md)。

## 7. 攻击/跳跃穿插：统一动作通道与空中动作

三个研究候选又通过真实 `MatchCore → ActionExecutionSystem → MatchReplay` 验证了两个基础操作场景：同 tick 的地面攻击和跳跃分别产生武器 `ActionStarted` 与 `movement.explicit-ground-jump`；先跳跃后攻击则选择候选自己的 aerial `ActionDefinition`，并通过 `begin-down-smash` 进入 `down-smash` movement mode。六场 Replay 均为 schema V5、8 个 checkpoint、84 个输入帧，二次最终 hash 校验通过。

这一步关闭了“研究动作仍缺少攻击/跳跃穿插和空中下降语义”的研究缺口，但不代表三人/网络多人、最终姿态、音效特效或真人可读性完成。详细记录见[武器攻击/跳跃穿插 Replay 原型结果 V1](arena-v2-weapon-attack-jump-interleave-replay-results-v1.md)。

## 8. 研究证据如何被使用

### 直线压制

继续复用单一攻击线候选 Definition，补齐默认生产注册和设备可读性。不能因为它出手快就直接变成生产远程武器。

### 读招反制

承诺、提前取消、有效窗口和到期处理已经进入统一研究动作状态与 Replay；双人边缘命中和研究反馈来源也已验证。下一步验证玩家能否读懂高回报对应的长承诺。

### 绕后

目标主动转身、active 前多次转身和侧向进入已经进入 Replay；双人边缘反馈来源与多目标视线遮挡观察负担也已验证。下一步补充分叉路线观察负担、最终反馈 Cue 和真人可读性，研究遮挡探针不能代替三人/网络多人规则。

## 9. 下一批实现顺序

1. 将读招反制和绕后的边缘 Replay 扩展到分叉路线与目标重入；侧向进入、视线遮挡研究探针和攻击/跳跃穿插的基础证据已通过。
2. 将反馈语义接入最终声音/特效资产候选，并准备设备可读性验收；不把灰盒 Cue 当作最终资产。
3. 建立真人数值解释、命中归因和 3 分钟基础操作采集任务，保持真人样本为空时的 `incomplete` 状态。
4. 基于内容层候选 Registry 补齐最终资产、设备/真人验收和默认目录迁移方案，单独评审是否进入 `STAGE4_*` 内容。
5. 只有五项门禁全部通过，才允许单独评审是否进入正式 `STAGE4_*` 内容；本门禁不自动晋级。

## 10. 当前明确结论

本轮已经完成“直线压制、读招反制、绕后的动作状态、候选 Replay、双人边缘后果、侧向进入、视线遮挡研究证据、研究反馈来源、攻击/跳跃基础穿插和内容层候选 Registry 收敛”，没有完成“六把武器默认生产化”。三个研究候选仍为 4/5，生产 Definition 门禁明确阻塞在默认目录、最终资产和真人/设备验收边界；生产基线仍缺候选专属 Replay。下一步继续做分叉路线观察负担、最终表现资产和真人可读性，不扩张角色、按键、界面或收藏系统。
