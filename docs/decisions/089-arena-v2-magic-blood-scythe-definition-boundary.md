# ADR-089：魔血镰刃先以封路、上下文和路线后果收敛

- 状态：accepted
- 日期：2026-07-28
- 范围：Arena V2 魔血镰刃研究 Definition、公共数值投影、路线 Replay 和延迟危险区边界

## 背景

官方魔血镰刃说明同时包含中距离魔轮、脚下陷阱、跑动急停、空中短按/长按、跑动蓄力档位和地面突起。[官方说明](https://bfo.web.sdo.com/web4/introduce/prop_explanation.asp?id=793) 的研究价值在于这些动作改变了对手的路线选择，而不只是增加伤害。若直接复制整套系统，会把自动锁定、无限持续、无敌和资源规则带入 Arena，超出“方向 + 跳跃”的最小操作边界。

## 决策

1. 先用一个地面 `facing-capsule` 和一个空中 `downward-cylinder` 表达“封路并改变落点”，两者分别投影距离、覆盖、起手、有效窗口、恢复、横向作用、垂直作用、控制、自身位移、冷却和高度差。
2. 延迟危险区只作为独立 `warningHypothesis` 保留 `delayTicks`、`warningTicks`、`activeTicks`、半径和高度差；接入预警区运行时前，不得把它写成 `ActionDefinition` 已具备的权威能力。
3. 使用真实 `MatchCore + MatchReplay` 验证安全命中、active 前离开攻击线和边缘击落，反馈必须分别显示命中、未命中和支撑面丢失。
4. 官方原作的自动锁定、无限叠加陷阱、三档保护/无敌、MP、复杂多段派生和原作资产不进入本轮 Definition。
5. 所有 Definition、数值投影和 Replay 保持 `research-only`；完成 KZ 多表面、反馈、设备和真人门禁前，不得注册默认生产装备。

## 被拒绝的替代方案

### 只写“范围大”或“封路型”

拒绝原因：玩家无法比较地面和空中距离、覆盖、起手、恢复与高度差，武器差异会退化成外观和标签。

### 把官方持续陷阱时间直接迁移为生产状态

拒绝原因：持续区域必须先验证公开预警、离开/等待/换路线回应和地图拥挤，否则会成为不可读的永久封路。

### 用自动锁定补偿瞄准

拒绝原因：会消除方向、距离和路线学习；Arena 的研究版本固定攻击线，保留玩家熟悉武器与地图的核心学习。

## 后果

- 魔血镰刃成为第五件接入统一研究概览的逐件武器，当前六件案例中仅猛犸石斧仍未接入 Definition 数值投影。
- 研究人员可以用同一套主轴比较魔血镰刃与白金双枪、血影钩刃、幻虎巨拳和真·哈迪斯钩镰，同时看到它们的上下文行为差异。
- 路线后果来自 MatchCore 的支撑面与淘汰事件，不由表现层猜测；预警危险区仍需要单独研究证据。
- 生产范围没有扩张，仍需补预警运行时、KZ 多地图、反馈、设备和真人可读性证据。

## 验证入口

- [魔血镰刃 Definition 与路线 Replay 原型结果 V1](../research/arena-v2-weapon-magic-blood-scythe-definition-and-replay-results-v1.md)
- `packages/arena-v1-experiment/src/arena-v2-weapon-magic-blood-scythe-definition-prototype.ts`
- `packages/arena-v1-experiment/src/arena-v2-weapon-magic-blood-scythe-replay-prototype.ts`
- [ADR-069：命中反馈必须保留失败原因的因果区分](069-arena-v2-hit-feedback-causal-contract.md)
