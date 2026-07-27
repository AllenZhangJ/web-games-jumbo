# 魔血镰刃 Definition 与路线 Replay 原型结果 V1

## 状态

- 状态：研究 Definition、公共数值投影和真实 MatchCore/MatchReplay 已通过
- 日期：2026-07-28
- 生产影响：不新增默认武器、不修改生产 Content Registry、不进入正式玩家 UI
- 原作依据：[《新热血英豪》魔血镰刃官方说明](https://bfo.web.sdo.com/web4/introduce/prop_explanation.asp?id=793)

## 本轮结论

魔血镰刃先收敛为“封路并改变落点”的研究武器：

1. 地面动作使用 `facing-capsule`，公开中距离、宽覆盖、起手、有效窗口、恢复、击退和冷却。
2. 空中动作使用独立 `downward-cylinder`，公开高度差、覆盖和下落风险；不把地面动作复制到空中。
3. 延迟危险区只记录为 `warningHypothesis`，保留延迟、预警、有效期和半径的整数 tick 假设；当前没有宣称它已接入权威动作运行时。
4. 不复制官方说明中的自动锁定、无限叠加陷阱、三档保护/无敌、MP 和复杂派生追击。

官方页面是动作行为的学习来源，不是 Arena 数值来源。本文的 `20/3/24/96 tick` 等数值是项目可测试假设，不是原作数值，也不是平衡结论。

## Definition 投影

| 上下文 | targeting | 距离 | 覆盖宽度 | 起手 | 有效窗口 | 恢复 | 横向作用 | 垂直作用 | 高度差 | 冷却 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 地面 | `facing-capsule` | 4.00 格 | 2.40 格 | 20 tick | 3 tick | 24 tick | 1.40 格 | 3.40 冲量 | 1.50 格 | 96 tick |
| 空中 | `downward-cylinder` | 3.20 格 | 2.80 格 | 16 tick | 4 tick | 28 tick | 1.20 格 | 4.80 冲量 | 3.20 格 | 96 tick |

概览仍同时显示 9 个主轴、6 个上下文轴和 2 个行为轴。地面/空中的数值从同一份 `ActionDefinition` 投影，不能由 UI 手写。

## Replay 证据

三组场景均使用固定 seed `0x4d425343`，通过真实 `MatchCore + MatchReplay` 生成并再次验证最终 hash：

| 场景 | 动作开始 | active 采样 | 首次命中事件 | 地图结果 | 反馈 | 最终 hash |
| --- | ---: | ---: | ---: | --- | --- | --- |
| `ground-hit-safe` | 1 | 22 | 21 | 保留支撑面，目标水平位移约 0.52 格 | 命中·仍保留支撑面 | `704a6e65` |
| `ground-leaves-line` | 1 | 22 | 无 | 目标在 active 前离开攻击线 | 未命中·路线已离开 | `ebe955af` |
| `ground-edge` | 1 | 22 | 21 | tick 72 失去支撑面并击落 | 命中·支撑面丢失 | `d626b20c` |

这里的事件 tick 与快照中的 active 采样相差一个规则边界 tick，属于当前 Replay 事件/快照时序定义；验证只使用权威事件和最终 hash，不由表现层补齐。

这三组证据证明：宽覆盖不是自动追踪；同一命中在宽平台与边缘平台可以产生不同结果；反馈需要区分命中、未命中和失去支撑面。它们不证明延迟危险区、特效、设备触控、真人首见时间或生产平衡已经完成。

## 验证入口

- `packages/arena-v1-experiment/src/arena-v2-weapon-magic-blood-scythe-case-study.ts`
- `packages/arena-v1-experiment/src/arena-v2-weapon-magic-blood-scythe-definition-prototype.ts`
- `packages/arena-v1-experiment/src/arena-v2-weapon-magic-blood-scythe-replay-prototype.ts`
- `packages/arena-v1-experiment/test/arena-v2-weapon-magic-blood-scythe-definition-prototype.test.ts`
- `packages/arena-v1-experiment/test/arena-v2-weapon-magic-blood-scythe-replay-prototype.test.ts`

## 下一步

1. 将 `warningHypothesis` 接入已有独立预警区研究运行时，验证离开、等待和换路线三种回应。
2. 在六段 KZ MapDefinition 的宽平台、断层、窄路和走钢丝表面复测地面/空中命中。
3. 接入命中特效、受击归因、设备触控和真人首见时间任务，再判断是否进入生产迁移门禁。
