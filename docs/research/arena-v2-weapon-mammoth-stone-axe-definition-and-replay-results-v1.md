# 猛犸石斧 Definition 与预判落点 Replay 原型结果 V1

## 状态

- 状态：研究 Definition、公共数值投影和真实 MatchCore/MatchReplay 已通过
- 日期：2026-07-28
- 生产影响：不新增默认武器、不修改生产 Content Registry、不进入正式玩家 UI
- 原作依据：[《新热血英豪》猛犸石斧官方说明](https://bfo.web.sdo.com/web4/introduce/prop_explanation.asp?id=775)

## 本轮结论

猛犸石斧先收敛为“预判落点并改变路线”的研究武器：

1. 地面动作使用较长前摇的 `facing-capsule`，把高横向/垂直作用和较长恢复绑定，保留空放风险。
2. 空中动作使用独立 `downward-cylinder`，显示更大的高度差和空中落点风险，不复用地面动作。
3. 延迟落点、预警、有效窗口和高度躲避继续由独立 `arena-v2-weapon-mammoth-stone-axe-delay-prototype.ts` 验证，不把预警区伪装成已接入的普通动作。
4. 滚动物体、墙面反弹、猛犸公共危险、自伤和猛犸肉先不进入本轮 Definition；它们需要分别验证移动实体、地图几何、敌我共同受影响和资源争夺。

官方页面是动作结构的学习来源，不是 Arena 数值来源。本文的 `24/3/32/108 tick` 等数值是项目可测试假设，不是原作数值，也不是平衡结论。

## Definition 投影

| 上下文 | targeting | 距离 | 覆盖宽度 | 起手 | 有效窗口 | 恢复 | 横向作用 | 垂直作用 | 高度差 | 冷却 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 地面 | `facing-capsule` | 3.60 格 | 2.40 格 | 24 tick | 3 tick | 32 tick | 2.10 格 | 5.50 冲量 | 1.50 格 | 108 tick |
| 空中 | `downward-cylinder` | 3.60 格 | 2.40 格 | 14 tick | 4 tick | 34 tick | 1.80 格 | 6.20 冲量 | 3.40 格 | 108 tick |

六件深研案例现在都能通过同一概览显示地面/空中两套数值；猛犸石斧的延迟和预警仍属于行为研究信号，不被硬塞进公共 9 轴。

## Replay 证据

三组场景均使用固定 seed `0x4d534158`，通过真实 `MatchCore + MatchReplay` 生成并再次验证最终 hash：

| 场景 | 动作开始 | active 采样 | 首次命中事件 | 地图结果 | 反馈 | 最终 hash |
| --- | ---: | ---: | ---: | --- | --- | --- |
| `ground-hit-safe` | 1 | 26 | 25 | 保留支撑面，目标水平位移约 0.64 格 | 命中·仍保留支撑面 | `2e03a63b` |
| `ground-leaves-line` | 1 | 26 | 无 | 目标在 action 生效前离开攻击线 | 未命中·预判落点失败 | `48f4ed9f` |
| `ground-edge` | 1 | 26 | 25 | tick 83 失去支撑面并击落 | 命中·支撑面丢失 | `b65b75de` |

事件 tick 与 active 快照相差一个规则边界 tick，与其他研究动作保持同一 Replay 语义。证据说明长前摇确实给目标路线回应窗口，命中后的结果仍由支撑面决定；它不证明滚动物体、墙面反弹、公共危险、恢复物、设备触控或真人可读性已经完成。

## 与既有延迟预警探针的关系

现有延迟探针继续固定验证 `18 tick` 预警、`2 tick` 有效窗口、提前离开、命中时离开和跳跃越过四种结果。它只负责回答“落点预警是否给出公平回应窗口”，不负责替代地面/空中武器动作 Replay。两者边界分开，避免把延迟区域的几何结果误读为普通攻击的起手时间。

## 验证入口

- `packages/arena-v1-experiment/src/arena-v2-weapon-mammoth-stone-axe-case-study.ts`
- `packages/arena-v1-experiment/src/arena-v2-weapon-mammoth-stone-axe-definition-prototype.ts`
- `packages/arena-v1-experiment/src/arena-v2-weapon-mammoth-stone-axe-replay-prototype.ts`
- `packages/arena-v1-experiment/src/arena-v2-weapon-mammoth-stone-axe-delay-prototype.ts`
- `packages/arena-v1-experiment/test/arena-v2-weapon-mammoth-stone-axe-definition-prototype.test.ts`
- `packages/arena-v1-experiment/test/arena-v2-weapon-mammoth-stone-axe-replay-prototype.test.ts`

## 下一步

1. 在六段 KZ MapDefinition 的窄路、墙面和断层上复测地面/空中动作的地图后果。
2. 分别建立滚动物体、墙面反弹和公共危险的研究探针，不把三者混成一个“大招”。
3. 完成命中归因、设备触控和真人首见时间后，才进入六件武器统一迁移门禁评估。
