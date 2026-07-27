# Arena V2 首发研究候选 Definition 原型结果 V1

## 1. 状态与边界

- 状态：三个首发研究候选的统一数值 Definition 原型通过，仍未进入生产目录
- 日期：2026-07-28
- 实现：`packages/arena-v1-experiment/src/arena-v2-weapon-launch-research-definition-prototype.ts`
- 共享投影：`packages/arena-v1-experiment/src/arena-v2-weapon-action-public-projection.ts`
- 测试：`packages/arena-v1-experiment/test/arena-v2-weapon-launch-research-definition-prototype.test.ts`
- 关联决策：[ADR-070：六个首发位置统一使用 Definition 数值投影](../decisions/070-arena-v2-research-launch-definition-projection.md)

本原型不是新增三把正式武器，而是把直线压制、读招反制、绕后三个候选从“动作语言原型”编译为统一的 research-only Definition。生产基线仍由真实权威内容提供，研究候选只用于比较、地图探针、规则验证和后续表现研究。

## 2. 统一合同

每个候选现在都具备：

- 一套地面 `ActionDefinition`；
- 一套空中 `ActionDefinition`；
- 9 项主概览数值：距离、覆盖、出手、收招、横向击飞、垂直控制、控制、自身位移风险、冷却；
- 2 项行为补充数值：有效窗口、方向容错；
- 固定“原地等待命中 / 提前离开未命中”回应证据；
- 核心动词、反制方式和适用地图空间。

数值全部从 ActionDefinition 的 targeting、timing、effect 和固定物理公式投影，不由武器卡手工填写。

## 3. 三个候选的数值差异

下表为地面动作的研究对照值，tick 是权威研究时间单位，不是最终平衡承诺。

| 候选 | 距离 | 覆盖宽度 | 出手 | 收招 | 横向击飞 | 有效窗口 | 方向容错 | 主要学习点 |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| 直线压制 | 5.50 格 | 6.60 格 | 8 tick | 18 tick | 0.55 格 | 3 tick | 73.74° | 通过攻击线逼迫换路线 |
| 读招反制 | 3.20 格 | 4.23 格 | 24 tick | 28 tick | 2.40 格 | 2 tick | 82.82° | 用长承诺换高回报 |
| 绕后 | 3.40 格 | 5.17 格 | 10 tick | 22 tick | 2.00 格 | 3 tick | 98.92° | 同时观察目标朝向和路线 |

空中动作继续保留上下文差异：直线压制距离收窄但高度差扩大，读招反制出手更快但收招更长，绕后距离与方向条件改变。它们不是单纯换外观，而是同一攻击输入在不同空间中的不同问题。

## 4. 规则回应证据

三个候选都通过同一套固定对照：

| 回应 | 结果 | 证据意义 |
|---|---|---|
| 原地等待 | 命中 | 玩家承担该武器公开攻击窗口的结果 |
| 在回应窗口前离开 | 未命中 | 玩家可以用基础移动理解并执行反制 |

这组证据只证明最小命中/空放链路可复现，不能代替 KZ 六段地图后果、多人拥挤、音效特效和真人解释率。

## 5. 这批结构性调整解决了什么

此前三个研究候选分别拥有动作原型，但没有一份统一的可比较 Definition。现在迁移审计可以同时检查：

```text
研究候选
  → 地面/空中 ActionDefinition
  → 共享数值投影
  → 概览 9 轴 + 行为 2 轴
  → 命中/空放固定证据
```

因此六个首发位置都已经能回答“它和另一把武器的数值差异是什么”。这不等于六把武器已经平衡或已上线。

## 6. 未完成项

- 读招反制的蓄力承诺、取消和到期状态已经接入研究边界内的统一动作状态与候选 Replay；正式 Definition、反馈来源和生产迁移仍未完成，详见[读招反制承诺状态与 Replay 原型结果](arena-v2-weapon-read-punish-replay-results-v1.md)；
- 直线压制仍是可读攻击线判定，不是真实投射物飞行；
- 绕后需要继续验证目标主动转身、侧后方判定和分叉路线；
- 三个候选还没有正式 Presentation 事件、音效、特效、设备字号和真人可读性证据；
- 所有候选仍不得进入生产 `EquipmentDefinition`。
