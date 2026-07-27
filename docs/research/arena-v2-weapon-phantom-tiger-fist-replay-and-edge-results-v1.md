# 幻虎巨拳 Replay 与地图边缘原型结果 V1

## 状态与边界

- 状态：研究候选 Replay、承诺状态和双人地图边缘后果通过
- 日期：2026-07-28
- 生产影响：不注册默认生产目录，不改变正式玩家存档、正式武器卡或正式页面
- 候选：`case-study-phantom-tiger-fist`
- 数值性质：`definition-projected-hypothesis`；结果证明规则链路成立，不代表真人平衡已经完成

本轮把幻虎巨拳从“能投影数值”推进到真实 `MatchCore → ActionExecutionSystem → MatchReplay`，并在同一套 Definition 上增加双人边缘平台场景。验证重点不是把结果调成“必定击落”，而是确认命中、位移、支撑面和淘汰可以被分开观察。

## Replay 承诺验证

固定 seed 为 `1346917446`，Replay schema 为 V5，每场 9 个 checkpoint、96 个输入帧。

| 场景 | 动作开始 | 承诺结算 | 首次命中 | 最终 hash | 结论 |
| --- | ---: | ---: | ---: | --- | --- |
| 提前释放 | tick 1 | tick 9 取消 | 无 | `fe982085` | 只蓄力到等级 1，松开后回到 idle，不产生命中 |
| 成功提交 | tick 1 | tick 13 提交 | tick 21 | `15d9cbb0` | 达到 12 tick 承诺后，进入有效窗口并命中 |
| 到期持续按住 | tick 1 | tick 19 取消 | 无 | `fe982085` | 超过 18 tick 到期仍未释放时取消，不替玩家自动释放 |

动作快照同时公开 `charging/committed`、`chargeTicks`、`chargeLevel`、地面/空中动作阶段和位置采样。当前原型没有新增按键，承诺、取消和有效窗口仍由权威动作状态裁决。

## 地图边缘验证

边缘场景使用两名玩家、宽度 8 格的平台，目标初始中心位于 `x=3.4`，攻击者在 `x=0`。目标先通过地图安全校验，再由幻虎巨拳地面动作完成承诺释放。

| 项目 | 结果 |
| --- | ---: |
| 平台半宽 | 4 格 |
| 目标初始 x | 3.4 格 |
| 动作开始 | tick 1 |
| 承诺提交 | tick 13 |
| 首次命中 | tick 21 |
| 目标掉落判定 | tick 78 |
| 目标水平位移 | 0.60 格 |
| 淘汰参与者 | `player-2` |
| 结果 | `hit-ring-out` |
| 最终 hash | `5307162a` |

这条链路现在是可回放的：承诺提交不是 UI 文案，命中不是淘汰，淘汰也不是由表现层推测；三者分别来自 `ActionCommitmentCommitted`、`HitResolved` 和 `PlayerEliminated`。反馈结果使用“击落·失去支撑面”，而不是泛化成普通命中。

## 设计结论

1. 幻虎巨拳的核心可玩差异可以先落在“可转向蓄力承诺 + 地面/空中上下文 + 地图边缘后果”，不需要增加新操作键。
2. 武器概览可以公开承诺时间、出手、有效窗口、横向作用、垂直控制、命中高度差和方向容错；这些字段仍必须标注为 Definition 投影假设。
3. 地图验证必须至少包含“命中但保留支撑面”和“命中后失去支撑面”两种结果，避免把横向作用数字直接等同于淘汰率。
4. 当前仍缺少真人读招时间、空中分支可读性、正式命中 Cue、设备表现和多地图重复验证，因此幻虎巨拳不能进入生产迁移。

## 验证入口

- `packages/arena-v1-experiment/src/arena-v2-weapon-phantom-tiger-fist-definition-prototype.ts`
- `packages/arena-v1-experiment/src/arena-v2-weapon-phantom-tiger-fist-replay-prototype.ts`
- `packages/arena-v1-experiment/src/arena-v2-weapon-phantom-tiger-fist-edge-replay-prototype.ts`
- `packages/arena-v1-experiment/test/arena-v2-weapon-phantom-tiger-fist-replay-prototype.test.ts`
- `packages/arena-v1-experiment/test/arena-v2-weapon-phantom-tiger-fist-edge-replay-prototype.test.ts`
- `npm run test:governance -- --run packages/arena-v1-experiment/test/arena-v2-weapon-phantom-tiger-fist-replay-prototype.test.ts packages/arena-v1-experiment/test/arena-v2-weapon-phantom-tiger-fist-edge-replay-prototype.test.ts --testTimeout 10000`
