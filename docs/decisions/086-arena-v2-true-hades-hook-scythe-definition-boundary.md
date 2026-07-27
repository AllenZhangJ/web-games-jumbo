# ADR-086：真·哈迪斯钩镰先以承诺、上下文和支撑面后果收敛

- 状态：accepted
- 日期：2026-07-28
- 范围：Arena V2 真·哈迪斯钩镰研究 Definition、数值概览、承诺 Replay 和平台边缘后果

## 背景

真·哈迪斯钩镰的研究价值不在于复制原作的整套动作数量，而在于它同时展示了阶段承诺、地面/空中上下文和支撑面结果。如果只做外观或只给一条“近战强度”数值，玩家无法理解提前释放、空中高度和平台边缘为什么改变结果。

## 决策

1. 地面研究动作使用不可转向的 `facing-cone`，以 `8 tick` 作为提交节点，`14 tick` 到期取消；提前释放和到期持续按住都不自动派生后段。
2. 空中研究动作独立使用 `downward-cylinder` 和高度差，不复用地面承诺状态；地面/空中分别投影距离、覆盖、出手、收招、横向击飞、垂直控制、控制时间、自身位移风险和再次使用时间。
3. 先用真实 `MatchCore + MatchReplay` 验证“取消 → 无命中”“提交 → 命中”“命中 → 支撑面保留/丢失”四类结果，表现层只能消费这些权威事件。
4. 原作反弹刀光、多阶段追击、无敌、反击、固定伤害和生命系统不进入本轮 Arena Definition；支撑面后果也不因此被表述成通用击落率。
5. 所有 Definition、数值投影和 Replay 保持 `research-only`，未通过真实 KZ 多地图、反馈 Cue、设备和真人门禁前，不得注册默认生产装备。

## 被拒绝的替代方案

### 用一个“镰刀强度”替代地面/空中数值

拒绝原因：会隐藏命中高度差、出手/收招和自身位移风险，无法支持玩家在 200 小时内学习武器与地图的长期差异。

### 自动把持续按住转换为后段攻击

拒绝原因：会消除原作中最有价值的承诺和反制窗口，也无法验证提前释放与到期取消的失败成本。

### 用位移数字直接推断击落

拒绝原因：击落必须经过真实支撑面和正式淘汰事件；宽平台与边缘平台的同一命中不能显示相同结果。

## 后果

- 真·哈迪斯钩镰可以进入统一案例概览和数值可读性研究，但只能标记为研究投影假设。
- 研究员能把“动作没成立”“动作命中但仍安全”“命中后失去支撑面”区分开，后续反馈设计有明确因果来源。
- 研究范围没有扩张角色数量、操作按键或局外页面；深度来自武器上下文和地图后果。
- 真实空中 Replay、多地图 KZ 表面、真人读招和设备表现仍是迁移前置条件。

## 验证入口

- `packages/arena-v1-experiment/src/arena-v2-weapon-true-hades-hook-scythe-definition-prototype.ts`
- `packages/arena-v1-experiment/src/arena-v2-weapon-true-hades-hook-scythe-replay-prototype.ts`
- [真·哈迪斯钩镰 Definition 与承诺/支撑面 Replay 原型结果 V1](../research/arena-v2-weapon-true-hades-hook-scythe-definition-and-replay-results-v1.md)
- [ADR-075：承诺动作由统一 ActionExecutionSystem 裁决](075-arena-v2-action-commitment-state.md)
- [ADR-069：命中反馈必须保留失败原因的因果区分](069-arena-v2-hit-feedback-causal-contract.md)
