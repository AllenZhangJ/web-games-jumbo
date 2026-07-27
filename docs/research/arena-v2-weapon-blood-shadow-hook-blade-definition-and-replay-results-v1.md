# Arena V2 血影钩刃 Definition 与目标朝向 Replay 原型结果 V1

## 状态

- 状态：研究工具链原型通过
- 日期：2026-07-28
- 生产影响：不注册默认生产装备，不改变玩家界面和存档
- 数值性质：`definition-projected-hypothesis`，不是热血英豪原作数值，也不是生产平衡结论

## 研究问题

血影钩刃最值得迁移的不是“钩刃外观”，而是三层关系：目标是否背向、命中后双方距离如何改变、地图障碍是否会切断拉位。此次把能由当前权威规则表达的部分接入真实 `MatchCore + MatchReplay`，把当前规则尚未表达的障碍部分继续留在独立探针中。

## 最小 Definition

| 上下文 | Targeting | 主要公开差异 | 当前状态 |
| --- | --- | --- | --- |
| 地面 | `rear-cone`，有效距离 3.60 格，最小背向点积 0.72，高度差 1.40 格 | 出手 10 tick、收招 24 tick、拉近投影 1.80 格、自身位移风险 0.80 | 已接入研究 Definition |
| 空中 | `downward-cylinder`，半径 1.05 格，最大高度差 2.40 格 | 出手 12 tick、收招 27 tick、拉近投影 1.50 格、垂直冲量 3.80 | 已接入研究 Definition |

地面和空中使用不同 Targeting 与数值，避免把“同一件武器”压缩成一套平面属性。拉近使用当前规则层已有的 `pull-to-source` effect；数值投影器同时兼容普通方向冲量和拉近冲量，但两者都只表示 Arena 研究假设。

## Replay 结果

Replay 固定使用同一 seed、双人 MatchCore、普通移动输入和 MatchReplay 校验：

| 场景 | 目标朝向 | 命中 | 反馈 |
| --- | --- | --- | --- |
| `target-keeps-facing-away` | active 时保持背向 | 是 | `命中·距离被拉近` |
| `target-turns-to-attacker` | active 前转为正面 | 否 | `未命中·目标已转身` |
| `target-turns-back-before-active` | active 前重新背向 | 是 | `命中·距离被拉近` |

这组结果证明“背后命中”不是扩大攻击范围后的标签，而是由目标朝向在 active 时刻决定；同时命中反馈可以把受击和距离改变放到同一条可归因结果中。

## 障碍边界

实体障碍没有被伪装进这次 Definition。现有独立探针仍验证无遮挡、柱体阻挡、侧向错开和边角路线四类固定场景：无遮挡/侧向错开拉位成立，柱体/边角拉位被阻挡。下一步必须将探针接到真实地图表面和真实碰撞生命周期，再决定是否把“路径可阻挡”做成玩家可见研究字段。

## 不迁移内容

- 不复制原作武器名称、动作资产、职业属性、复杂连段、拘束、出血、无敌或自动追击。
- 不把障碍探针结果写入 Definition 的 9 个主数值轴。
- 不因研究投影已经可读，就进入默认生产 Registry。

## 验证入口

- `packages/arena-v1-experiment/src/arena-v2-weapon-blood-shadow-hook-blade-definition-prototype.ts`
- `packages/arena-v1-experiment/src/arena-v2-weapon-blood-shadow-hook-blade-replay-prototype.ts`
- `packages/arena-v1-experiment/test/arena-v2-weapon-blood-shadow-hook-blade-definition-prototype.test.ts`
- `packages/arena-v1-experiment/test/arena-v2-weapon-blood-shadow-hook-blade-replay-prototype.test.ts`
- `packages/arena-v1-experiment/src/arena-v2-weapon-hook-obstruction-prototype.ts`
- [血影钩刃障碍阻挡原型结果 V1](arena-v2-weapon-hook-obstruction-prototype-results-v1.md)
