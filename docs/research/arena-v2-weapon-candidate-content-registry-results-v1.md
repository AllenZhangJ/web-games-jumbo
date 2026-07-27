# Arena V2 武器候选 Content Registry 结果 V1

- 状态：候选 Definition 已进入内容层的显式 Registry，仍未接入默认生产目录
- 目标：结束“研究动作只在 experiment 包内临时生成”的结构缺口，同时保持研究候选不会未经资产和真人验收进入玩家版本
- 验证入口：`packages/arena-v1-content/src/arena-v2-weapon-candidate-content.ts`
- 默认生产入口：`createStage4ContentRegistries()`

## 1. 本批结构调整

此前五种研究动作和装备 Definition 在 `arena-v1-experiment` 内生成，研究 Replay、数值投影和动作探针都能消费，但内容层没有可复用的 Definition 来源。这会造成两种风险：

1. 研究数值与未来正式内容可能从不同工厂生成；
2. “已通过研究原型”容易被误读成“已进入生产目录”。

本批将以下内容抽到 `arena-v1-content`：

- 直线压制、封路、延迟重击、读招反制、绕后五种候选的地面/空中 `ActionDefinition`；
- 对应五个 `EquipmentDefinition`；
- 统一的候选语言 ID、武器 ID、动作 ID；
- 一个显式的 `createArenaV2WeaponCandidateContentRegistries()` 组合入口。

候选 Registry 仍使用 `research` 标签和候选表现语义，并且不是 `createStage4ContentRegistries()` 的默认组成。默认生产目录仍只有冲锋盾、重锤和引力锁链三把正式武器。

## 2. 可验证结果

| 检查项 | 结果 |
| --- | --- |
| 候选 Definition 数量 | 5 |
| 每个候选的地面/空中动作 | 已具备 |
| 空中动作的 `begin-down-smash` | 5/5 |
| 读招反制承诺状态 | `commit=12`、`expire=18`、到期取消 |
| 默认生产 Registry 装备数量 | 3 |
| 显式候选 Registry 装备数量 | 8（3 个生产基线 + 5 个候选） |
| 研究 Replay 是否改换第二套 Definition | 否，已改为消费内容层候选 Definition |

内容层测试还验证：默认 Registry 不包含 `research-line-pressure`，显式候选 Registry 能解析其地面和空中动作身份，且对象保持冻结。

## 3. 迁移边界

这不是六把武器已经上线。当前迁移审计将三个首发候选标记为 `candidate-definition`，而不是 `production-authority`：

- 候选 Definition 的身份和数值来源已经稳定；
- 研究动作状态、Replay、地图后果和反馈来源已有独立证据；
- 默认生产内容、最终音效/特效资产、多人遮挡、设备可读性和真人反馈任务仍未完成。

因此生产迁移门禁继续阻塞 `production-definition`，不会因为“有了 Registry”而自动晋级。

## 4. 下一步

1. 用候选 Registry 作为正式迁移评审的唯一 Definition 来源，删除剩余 experiment 层的重复内容工厂；
2. 补侧向进入、多人遮挡、连续回合和最终表现资产证据；
3. 完成目标设备字号/触控和真人反馈任务后，再决定是否把某个候选加入默认生产 Registry。
