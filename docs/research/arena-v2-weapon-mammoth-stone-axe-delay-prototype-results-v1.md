# 猛犸石斧延迟落点原型结果 V1

## 文档状态

- 状态：开发/测试工具链原型已通过固定探针；不是生产武器功能
- 日期：2026-07-28
- 目标：验证“看见预警后改变路线/高度”是否能形成可解释的命中与躲避结果
- 关联研究：[猛犸石斧逐动作研究结果 V1](arena-v2-weapon-mammoth-stone-axe-case-study-results-v1.md)

## 研究边界

官方说明把猛犸石斧的 ZC 描述为“约 3 秒后落到前方”，并把猛犸召唤描述为攻击者也可能受伤的公共危险。本原型只提取“延迟落点 + 公开预警 + 命中时检查空间”的结构，不把“约 3 秒”换算成 Arena 的玩家时间，也不复制猛犸、自伤、恢复物或原作伤害。

原型使用整数 tick 和已有预警区状态机。`18 tick` 的落点、`2 tick` 的有效窗口、半径 `1.4` 和高度差 `1` 都是 `research-hypothesis`，用于比较反制方式，不是平衡承诺。

## 固定探针

| 探针 | 响应 | 响应 tick | 结果 | 首次命中 | 反馈因果 |
| --- | --- | ---: | --- | ---: | --- |
| `hold-center` | 不改变路线 | — | `hit` | 18 | `impact-hit` |
| `step-out-early` | 在落点前离开范围 | 8 | `evaded-by-route` | — | `route-escape` |
| `step-out-at-impact` | 落点 tick 才离开范围 | 18 | `evaded-by-route` | — | `route-escape` |
| `jump-over` | 在落点前改变高度 | 12 | `evaded-by-height` | — | `height-escape` |

四组探针均在 tick 18 进入 `active`，有效窗口持续 2 tick。结果说明：

1. 延迟动作必须让玩家在落点前看见预警，否则“站着挨打”和“没有提示”无法区分；
2. 落点时才离开仍然可以躲开，说明最终判定应读取命中 tick 的位置，而不是在动作开始时锁死目标；
3. 改变高度应成为独立反馈，不应被通用的“未命中”吞掉；
4. 预警、有效窗口、覆盖半径和高度容错是四个不同的可读轴，不能压缩成一个“威力”字段。

## 对生产 Definition 的影响

当前 `ActionDefinition` 仍只有通用 `windup/active/recovery/cooldown`，尚未把“预警开始—延迟落点—有效窗口”作为独立的权威字段。本原型因此保持研究工具链边界：

- 可以继续复用预警区的整数 tick 和地图点测试；
- 不在生产武器中伪造官方约 3 秒；
- 后续若要进入正式 Definition，必须先增加明确的 telegraph/delay 合同、Replay 事件和玩家反馈事件；
- 生产候选仍需通过命中反馈、地图后果、设备表现和真人解释率门禁。

## 当前未完成

- 没有接入猛犸石斧的正式 `MatchCore + MatchReplay` 专属动作；
- 没有验证滚动物体、墙面反弹、公共危险和恢复物；
- 没有声音、特效、设备帧率和真人测试证据；
- `18/2/1.4/1` 仅为研究假设，不能写入生产平衡表、存档或匹配合同。

## 证据位置

- 原型：`packages/arena-v1-experiment/src/arena-v2-weapon-mammoth-stone-axe-delay-prototype.ts`
- 测试：`packages/arena-v1-experiment/test/arena-v2-weapon-mammoth-stone-axe-delay-prototype.test.ts`
- 共用状态机：`packages/arena-v1-experiment/src/arena-v2-warning-zone-prototype.ts`
- 决策：[ADR-082：延迟落点先以预警区和整数 tick 验证](../decisions/082-arena-v2-mammoth-stone-axe-delay-boundary.md)
