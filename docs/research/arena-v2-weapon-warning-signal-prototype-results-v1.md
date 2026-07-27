# Arena V2 武器延迟/预警信号原型结果 V1

## 状态

- 状态：研究工具链验证通过；不进入生产动作、生产武器或正式玩家数值
- 日期：2026-07-28
- 范围：魔血镰刃、猛犸石斧的 `warningHypothesis` 与统一预警区回应探针
- 实现：`packages/arena-v1-experiment/src/arena-v2-weapon-warning-signal-prototype.ts`
- 测试：`packages/arena-v1-experiment/test/arena-v2-weapon-warning-signal-prototype.test.ts`

## 为什么单独做这一层

延迟不是普通 `windup` 的同义词：`windup` 表示动作何时进入有效窗口，延迟/预警还要回答玩家何时看见危险、何时可以离开路线、改变高度或诱导攻击者落空。如果把这组字段藏在 Definition 里，武器概览会把魔血镰刃和猛犸石斧最重要的学习差异隐藏掉；如果直接把它们当成生产动作字段，又会把研究假设误当作权威规则。

因此本原型只做一件事：直接读取两件研究 Definition 的 `warningHypothesis`，统一生成预警区，并用同一组回应策略验证“停留、提前离开、到点离开、改变高度”四种因果结果。

## 来源值与统一探针

| 武器 | 来源 Definition | 延迟 | 预警 | 有效窗口 | 半径 | 最大高度差 |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| 魔血镰刃 | `research-magic-blood-scythe` | 18 tick | 18 tick | 6 tick | 1.35 | 1.5 |
| 猛犸石斧 | `research-mammoth-stone-axe` | 18 tick | 18 tick | 2 tick | 1.40 | 1.0 |

这些是 Arena 研究假设，不是热血英豪原作数值，也不是生产平衡结论。页面概览中的独立信号表与本原型读取同一份 Definition 来源，避免出现“表格一组数、探针另一组数”。

## 固定结果

每件武器 4 个策略，共 8 个探针：

| 回应策略 | 预期结果 | 反馈原因 |
| --- | --- | --- |
| `hold-center` | 在有效窗口内命中 | `impact-hit` |
| `step-out-early` | 提前离开危险半径，未命中 | `route-escape` |
| `step-out-at-active` | 有效窗口开始时离开，未命中 | `route-escape` |
| `jump-over` | 超过最大高度差，未命中 | `height-escape` |

验证结果确认两件武器的 8 个探针均可重复，并且每个结果同时保留 `firstActiveTick`、`firstHitTick`、有效窗口、距离和高度差。没有把所有未命中压成“闪避成功”，路线离开和高度越过保持不同因果反馈。

## 与现有动作和页面的关系

- 普通地面/空中矩阵继续展示距离、覆盖、出手、收招、横向作用、垂直控制、控制、再次使用、命中高度差，以及有效窗口和方向容错等已具备来源的字段。
- 本原型的延迟、预警、半径和高度差仍属于研究信号；它们在概览中可见，但不会被塞进普通 9 项主轴，也不会自动注册成生产 `ActionDefinition`。
- 真实 `MatchCore + MatchReplay` 仍负责即时命中、击飞和地图支撑面后果；本原型负责独立验证“公开危险 → 玩家回应 → 命中/躲避”的时间因果。
- 未来若接入权威预警运行时，必须保持同一来源 Definition、同一整数 tick 语义和同一反馈分类，不能由 Renderer 根据特效自行猜测。

## 当前关闭与未关闭的问题

已关闭：

- 概览显示的延迟信号有直接 Definition 来源；
- 魔血镰刃和猛犸石斧使用同一套预警区生命周期和回应探针；
- 停留、提前离开、到点离开、改变高度的结果可以区分并保持确定性。

未关闭：

- 玩家是否真的能在手机画面和声音中发现预警；
- 预警标记被遮挡、多人重叠和不同摄像机距离下是否仍然清晰；
- 延迟区域与正式武器动作、KZ 多表面、复活重入和多人网络状态合并后的平衡；
- 真人首见时间、误判原因和 200 小时长期留存影响。

## 验证入口

- `runArenaV2WeaponWarningSignalPrototype()`
- `packages/arena-v1-experiment/test/arena-v2-weapon-warning-signal-prototype.test.ts`
- [深研武器概览适配层原型结果 V1](arena-v2-weapon-case-study-overview-prototype-results-v1.md)
- [武器数值可读性任务原型结果 V1](arena-v2-weapon-readability-task-prototype-results-v1.md)
- [ADR-082：延迟落点先以预警区和整数 tick 验证](../decisions/082-arena-v2-mammoth-stone-axe-delay-boundary.md)
